import { asUser, getSignedInUser } from '@/lib/session';
import { readWebsiteMedia } from '@/modules/core/services/website-media.service';
export const dynamic = 'force-dynamic';
const headers = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; sandbox",
};
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    let body: Buffer;
    try {
      body = await readWebsiteMedia(id);
    } catch {
      const user = await getSignedInUser();
      if (!user) throw new Error('Not found');
      body = await asUser(user, () => readWebsiteMedia(id, true));
    }
    return new Response(new Uint8Array(body), {
      headers: { ...headers, 'Content-Type': 'image/webp' },
    });
  } catch {
    return new Response('Image not found.', { status: 404, headers });
  }
}
