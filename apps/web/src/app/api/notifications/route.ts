import { asUser, getSignedInUser } from '@/lib/session';
import { listTickets } from '@/modules/tickets/services/ticket.service';
import { listNewAssignmentsToMe } from '@/modules/tasks/services/task.service';

/**
 * What is new for the signed in person since a moment, for browser notifications (John's team,
 * 15 Oct 2026). Two kinds only, the two that need someone to act: a ticket the customer has written
 * on that this person has not opened (their own, or unassigned for those who see the whole desk),
 * and a task someone else assigned to them. The browser polls this every 30 seconds while COEX is
 * open and shows a notification for anything it has not shown yet.
 *
 * Nothing here changes any data, and opening a ticket still clears its unread mark as before.
 */

const MAX_EVENTS = 20;

export async function GET(request: Request) {
  const user = await getSignedInUser();
  if (user?.role === 'client_contact')
    return Response.json({ error: 'Not allowed.' }, { status: 403 });
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });

  const asked = new URL(request.url).searchParams.get('since');
  const serverTime = new Date();
  // A first call, or an unusable value, starts from now: enabling notifications must not replay
  // everything that happened before.
  const parsed = asked ? new Date(asked) : serverTime;
  const since = Number.isNaN(parsed.getTime()) ? serverTime : parsed;

  const events = await asUser(user, async () => {
    const tickets = user.permissions.includes('ticket.read.own')
      ? await listTickets({
          openOnly: true,
          limit: 100,
          ...(user.permissions.includes('ticket.read.all') ? {} : { assigneeId: user.id }),
        })
      : [];
    const assignments = user.permissions.includes('task.read.own')
      ? await listNewAssignmentsToMe(since)
      : [];

    return [
      ...tickets
        .filter(
          (ticket): ticket is typeof ticket & { customerActivityAt: Date } =>
            ticket.unread &&
            ticket.customerActivityAt !== null &&
            ticket.customerActivityAt > since,
        )
        .map((ticket) => ({
          id: `ticket:${ticket.id}:${ticket.customerActivityAt.getTime()}`,
          title: `${ticket.number} needs a reply`,
          body: ticket.subject,
          url: `/support/tickets/${ticket.id}`,
          at: ticket.customerActivityAt.toISOString(),
        })),
      ...assignments.map((task) => ({
        id: `task:${task.id}:${task.at.getTime()}`,
        title: `${task.assignedByName} assigned you ${task.number}`,
        body: task.title,
        url: `/tasks/${task.id}`,
        at: task.at.toISOString(),
      })),
    ]
      .sort((a, b) => a.at.localeCompare(b.at))
      .slice(-MAX_EVENTS);
  });

  return Response.json({ events, serverTime: serverTime.toISOString() });
}
