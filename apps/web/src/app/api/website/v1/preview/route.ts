import { asUser, getSignedInUser } from '@/lib/session';
import { privateWebsiteDelivery } from '@/modules/core/services/website-delivery.service';
export const dynamic = 'force-dynamic';
const headers = {
  'Cache-Control': 'private, no-store, max-age=0',
  Vary: 'Cookie',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
};
export async function GET(request: Request) {
  try {
    const user = await getSignedInUser();
    if (!user) return Response.json({ error: 'Sign in required' }, { status: 401, headers });
    if (user.role !== 'platform_admin')
      return Response.json({ error: 'Not found' }, { status: 403, headers });
    const published = new URL(request.url).searchParams.get('version') === 'published';
    return Response.json(await asUser(user, () => privateWebsiteDelivery(published)), { headers });
  } catch {
    return Response.json({ error: 'Preview unavailable' }, { status: 403, headers });
  }
}
