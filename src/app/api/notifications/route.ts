import { asUser, getSignedInUser } from '@/lib/session';
import { notificationsSince } from '@/modules/core/services/notification.service';

/**
 * Notifications after a moment, for the browser to show. The reply carries the server's own time
 * for the next call, so a clock that is wrong on someone's computer never skips or repeats one.
 */
export async function GET(request: Request) {
  const user = await getSignedInUser();
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });

  const after = new URL(request.url).searchParams.get('after');
  const since = after ? new Date(after) : new Date();
  const now = new Date();
  const items = Number.isNaN(since.getTime())
    ? []
    : await asUser(user, () => notificationsSince(since));

  return Response.json({ now: now.toISOString(), items });
}
