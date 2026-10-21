import { asUser, getSignedInUser } from '@/lib/session';
import { portalNotifications } from '@/modules/portal/service';
export async function GET(request: Request) {
  const user = await getSignedInUser();
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (user.role !== 'client_contact')
    return Response.json({ error: 'Not allowed.' }, { status: 403 });
  const now = new Date();
  const raw = new URL(request.url).searchParams.get('since');
  const parsed = raw ? new Date(raw) : now;
  const since = Number.isNaN(parsed.getTime()) ? now : parsed;
  try {
    const events = await asUser(user, () => portalNotifications(since, now));
    return Response.json(
      { events, serverTime: now.toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json({ error: 'Portal unavailable.' }, { status: 403 });
  }
}
