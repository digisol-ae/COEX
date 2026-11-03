import { cookies } from 'next/headers';
import { publicShare, sharedDocument } from '@/modules/resources/service';
import { documentResponse, PRIVATE_HEADERS, resourceCookie } from '@/modules/resources/http';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; id: string }> },
) {
  const { token, id } = await params;
  try {
    const share = await publicShare(token);
    if (!share) throw new Error('Unavailable');
    const cookie = (await cookies()).get(resourceCookie(String(share._id)))?.value;
    const download = new URL(request.url).searchParams.get('download') === '1';
    return documentResponse(await sharedDocument(token, cookie, id, download), download);
  } catch {
    return new Response(
      'This document is unavailable. Open the resource link and verify your email code.',
      { status: 404, headers: PRIVATE_HEADERS },
    );
  }
}
