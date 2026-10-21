import { asUser, getSignedInUser } from '@/lib/session';
import { getTask, taskUpdateImage } from '@/modules/tasks/services/task.service';
import { PROCESSED_IMAGE_TYPES } from '@/modules/tickets/services/attachment.service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const user = await getSignedInUser();
  if (!user) return new Response('Sign in first.', { status: 401 });
  if (user.role === 'client_contact' || !user.permissions.includes('task.read.own'))
    return new Response('Not allowed.', { status: 403 });
  const { id, attachmentId } = await params;
  if (![id, attachmentId].every((value) => /^[a-f0-9]{24}$/i.test(value)))
    return new Response('Not found.', { status: 404 });
  const file = await asUser(user, async () => {
    const task = await getTask(id);
    if (
      !task ||
      (!user.permissions.includes('task.read.all') &&
        !task.assigneeIds.some((value) => String(value) === user.id))
    )
      return null;
    return taskUpdateImage(id, attachmentId);
  });
  if (!file) return new Response('Not found.', { status: 404 });
  const preview =
    new URL(request.url).searchParams.get('view') === '1' &&
    PROCESSED_IMAGE_TYPES.has(file.contentType);
  const name = file.fileName.replace(/["\\\r\n]/g, '');
  return new Response(new Uint8Array(file.body), {
    headers: {
      'content-type': preview ? file.contentType : 'application/octet-stream',
      'content-disposition': `${preview ? 'inline' : 'attachment'}; filename="${name}"`,
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
