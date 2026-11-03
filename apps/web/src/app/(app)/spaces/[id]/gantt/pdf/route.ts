import { z } from 'zod';
import { asUser, getSignedInUser } from '@/lib/session';
import { getSpace } from '@/modules/tasks/services/space.service';
import { listTasks } from '@/modules/tasks/services/task.service';
import { buildGanttPDF } from '@/modules/tasks/gantt-report';
const id = z.string().regex(/^[a-f0-9]{24}$/i);
const selection = z.object({
  taskIds: z.array(id).max(1000),
  showSubtasks: z.boolean().default(true),
  collapsedIds: z.array(id).max(1000).default([]),
});
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSignedInUser();
  if (!user) return new Response('Sign in first.', { status: 401 });
  if (user.role === 'client_contact' || !user.permissions.includes('task.read.all'))
    return new Response('Not allowed.', { status: 403 });
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return new Response('Origin denied.', { status: 403 });
  const { id: spaceId } = await params;
  if (!id.safeParse(spaceId).success) return new Response('Not found.', { status: 404 });
  const reader = request.body?.getReader();
  if (!reader) return new Response('Missing selection.', { status: 400 });
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > 65536) {
      await reader.cancel();
      return new Response('Selection too large.', { status: 413 });
    }
    chunks.push(value);
  }
  try {
    const input = selection.parse(JSON.parse(Buffer.concat(chunks).toString('utf8')));
    const result = await asUser(user, async () => {
      const space = await getSpace(spaceId);
      if (!space) return null;
      const tasks = await listTasks({ spaceId, ids: input.taskIds, includeClosed: true });
      if (tasks.length !== new Set(input.taskIds).size) return null;
      return buildGanttPDF({
        title: `${space.name} - Gantt`,
        tasks,
        now: new Date().toISOString(),
        showSubtasks: input.showSubtasks,
        collapsedIds: input.collapsedIds,
      });
    });
    if (!result) return new Response('Space or task unavailable.', { status: 404 });
    return new Response(new Uint8Array(result), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="worktello-gantt.pdf"',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Could not export this chart. Narrow the filters and try again.', {
      status: 400,
    });
  }
}
