import { asUser, getSignedInUser } from '@/lib/session';
import { staffResourceFile } from '@/modules/resources/service';
import { documentResponse, PRIVATE_HEADERS } from '@/modules/resources/http';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSignedInUser();
  if (!user || user.role === 'client_contact' || !user.permissions.includes('resource.read'))
    return new Response('Not allowed.', { status: 403, headers: PRIVATE_HEADERS });
  try {
    return documentResponse(
      await asUser(user, async () => staffResourceFile((await params).id)),
      new URL(request.url).searchParams.get('download') === '1',
    );
  } catch {
    return new Response('Document not found.', { status: 404, headers: PRIVATE_HEADERS });
  }
}
