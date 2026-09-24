import { asUser, getSignedInUser } from '@/lib/session';
import { getTask } from '@/modules/tasks/services/task.service';
import { loggedMinutesForTask, getRunningTimer } from '@/modules/time/services/time.service';

/**
 * The extra detail the slide over panel needs.
 *
 * The board already holds everything a card shows, so the panel opens with that and asks for the
 * rest: the description, the linked documents and the time logged. Fetching the whole task again
 * would make the panel wait to show anything, which is the exact feeling the panel exists to
 * avoid.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSignedInUser();

  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!user.permissions.includes('task.read.own')) {
    return Response.json({ error: 'Not allowed.' }, { status: 403 });
  }

  const { id } = await params;

  const detail = await asUser(user, async () => {
    const task = await getTask(id);
    if (!task) return null;

    const seesEverything = user.permissions.includes('task.read.all');
    const isMine = task.assigneeIds.some((assignee) => String(assignee) === user.id);

    if (!seesEverything && !isMine) return null;

    const timer = await getRunningTimer();

    return {
      description: task.description ?? null,
      tags: task.tags ?? [],
      documentLinks: (task.documentLinks ?? []).map((link) => ({
        id: String(link._id),
        url: link.url,
        title: link.title,
      })),
      loggedMinutes: await loggedMinutesForTask(id),
      timerRunning: timer?.kind === 'task' && timer?.itemId === id,
    };
  });

  if (!detail) return Response.json({ error: 'Not found.' }, { status: 404 });

  return Response.json(detail);
}
