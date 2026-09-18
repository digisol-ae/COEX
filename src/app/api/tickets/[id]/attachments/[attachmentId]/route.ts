import { asUser, getSignedInUser } from '@/lib/session';
import { attachmentForDownload } from '@/modules/tickets/services/attachment.service';
import { getTicketDetail } from '@/modules/tickets/services/ticket.service';

/**
 * Downloading one attachment.
 *
 * Nothing in the product hands out a storage key or a direct file URL, so a link cannot outlive
 * the permission that created it: every download is checked here, against this ticket, for this
 * person, at the moment they ask.
 *
 * The file is served as an attachment rather than inline. A customer's upload is untrusted
 * content, and an HTML or SVG file rendered in the browser on our own origin would run as us.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const user = await getSignedInUser();

  if (!user) return new Response('Sign in first.', { status: 401 });
  if (!user.permissions.includes('ticket.read.own')) {
    return new Response('Not allowed.', { status: 403 });
  }

  const { id, attachmentId } = await params;

  const file = await asUser(user, async () => {
    const ticket = await getTicketDetail(id);
    if (!ticket) return null;

    const seesEverything = user.permissions.includes('ticket.read.all');
    if (!seesEverything && ticket.assigneeId !== user.id) return null;

    return attachmentForDownload(id, attachmentId);
  });

  if (!file) return new Response('Not found.', { status: 404 });

  return new Response(new Uint8Array(file.body), {
    headers: {
      'content-type': 'application/octet-stream',
      'content-disposition': `attachment; filename="${file.fileName.replace(/["\\]/g, '')}"`,
      'content-length': String(file.body.byteLength),
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}
