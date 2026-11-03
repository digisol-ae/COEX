import { asUser, getSignedInUser } from '@/lib/session';
import { hasTrustedRequestOrigin } from '@/lib/request-origin';
import { listResources, saveResource } from '@/modules/resources/service';
import { boundedBody, PRIVATE_HEADERS } from '@/modules/resources/http';
import { MAX_RESOURCE_BYTES } from '@/modules/resources/rules';
export async function GET(request: Request) {
  const user = await getSignedInUser();
  if (!user || user.role === 'client_contact' || !user.permissions.includes('resource.read'))
    return Response.json({ error: 'Not allowed.' }, { status: 403 });
  const url = new URL(request.url);
  return Response.json(
    {
      resources: await asUser(user, () =>
        listResources(
          url.searchParams.get('search') ?? '',
          url.searchParams.get('published') === '1',
        ),
      ),
    },
    { headers: PRIVATE_HEADERS },
  );
}
export async function POST(request: Request) {
  const user = await getSignedInUser();
  if (!user || user.role === 'client_contact' || !user.permissions.includes('resource.manage'))
    return Response.json({ error: 'Not allowed.' }, { status: 403 });
  if (!hasTrustedRequestOrigin(request))
    return Response.json({ error: 'Refresh the page and try again.' }, { status: 403 });
  try {
    const body = await boundedBody(request, MAX_RESOURCE_BYTES + 65536);
    const form = await new Response(new Uint8Array(body), {
      headers: { 'Content-Type': request.headers.get('content-type') ?? '' },
    }).formData();
    const field = (key: string) => String(form.get(key) ?? '');
    const file = form.get('file');
    const id = await asUser(user, async () =>
      saveResource({
        id: field('id') || undefined,
        title: field('title'),
        description: field('description'),
        product: field('product'),
        category: field('category'),
        status: field('status') || 'draft',
        videoUrl: field('videoUrl') || undefined,
        file:
          file instanceof File && file.size
            ? { name: file.name, body: Buffer.from(await file.arrayBuffer()) }
            : undefined,
      }),
    );
    return Response.json({ id }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Could not save the resource.' },
      { status: 400, headers: PRIVATE_HEADERS },
    );
  }
}
