import { asUser, getSignedInUser } from '@/lib/session';
import { listTodaysTimers } from '@/modules/time/services/time.service';

/** Today's timers for the signed in person, for the tray in the header. */
export async function GET() {
  const user = await getSignedInUser();

  if (!user) {
    return Response.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const timers = await asUser(user, listTodaysTimers);

  return Response.json({ timers });
}
