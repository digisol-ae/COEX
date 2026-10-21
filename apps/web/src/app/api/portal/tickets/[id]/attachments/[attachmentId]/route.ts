import { asUser, getSignedInUser } from '@/lib/session';
import { portalAttachment } from '@/modules/portal/service';
import { PROCESSED_IMAGE_TYPES } from '@/modules/tickets/services/attachment.service';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const user = await getSignedInUser();
  if (!user) return new Response('Sign in first.', { status: 401 });
  if (user.role !== 'client_contact') return new Response('Not allowed.', { status: 403 });
  const { id, attachmentId } = await params;
  let file;
  try {
    file = await asUser(user, () => portalAttachment(id, attachmentId));
  } catch {
    return new Response('Not found.', { status: 404 });
  }
  if (!file) return new Response('Not found.', { status: 404 });
  const preview =
    new URL(request.url).searchParams.get('view') === '1' &&
    PROCESSED_IMAGE_TYPES.has(file.contentType);
  return new Response(new Uint8Array(file.body), {
    headers: {
      'Content-Type': preview ? file.contentType : 'application/octet-stream',
      'Content-Disposition': `${preview ? 'inline' : 'attachment'}; filename="${file.fileName.replace(/[\x00-\x1f\x7f-\uffff"\\]/g, '_')}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
