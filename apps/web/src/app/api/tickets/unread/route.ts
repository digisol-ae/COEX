import { asUser, getSignedInUser } from '@/lib/session';
import { countUnreadTickets } from '@/modules/tickets/services/unread.service';

/** The unread number on the Support icon, polled so it moves on pages that never refresh. */
export async function GET() {
  const user = await getSignedInUser();

  if (!user || !user.permissions.includes('ticket.read.own')) {
    return Response.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const count = await asUser(user, () =>
    countUnreadTickets({ includeUnassigned: user.permissions.includes('ticket.read.all') }),
  );

  return Response.json({ count });
}
