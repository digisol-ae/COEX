import { videoRange } from '@/modules/tutorials/video-rules';
import { asUser, getSignedInUser } from '@/lib/session';
import { currentTutorial } from '@/modules/tutorials/service';
import { fileStorage } from '@/lib/storage';

export async function GET(request: Request) {
  const user = await getSignedInUser();
  if (user?.role === 'client_contact')
    return Response.json({ error: 'Not allowed.' }, { status: 403 });
  if (!user) return new Response('Sign in first.', { status: 401 });
  const tutorial = await asUser(user, currentTutorial);
  if (
    !tutorial ||
    (!tutorial.active && !user.permissions.includes('tenant.manage')) ||
    new URL(request.url).searchParams.get('revision') !== tutorial.revision
  )
    return new Response('Not found.', { status: 404 });
  if (!tutorial.fileKey || !tutorial.contentType)
    return new Response('Not found.', { status: 404 });
  let bytes: Buffer;
  try {
    bytes = await fileStorage().get(tutorial.fileKey);
  } catch {
    return new Response('Video unavailable.', { status: 404 });
  }
  const headers = {
    'Content-Type': tutorial.contentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  const range = request.headers.get('range');
  if (range) {
    const parsed = videoRange(range, bytes.length);
    if (!parsed)
      return new Response(null, {
        status: 416,
        headers: { ...headers, 'Content-Range': `bytes */${bytes.length}` },
      });
    const { start, end } = parsed;
    return new Response(new Uint8Array(bytes.subarray(start, end + 1)), {
      status: 206,
      headers: {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${bytes.length}`,
        'Content-Length': String(end - start + 1),
      },
    });
  }
  return new Response(new Uint8Array(bytes), {
    headers: { ...headers, 'Content-Length': String(bytes.length) },
  });
}
