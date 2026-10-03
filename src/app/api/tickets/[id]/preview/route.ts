import { asUser, getSignedInUser } from '@/lib/session';
import { getTicketDetail } from '@/modules/tickets/services/ticket.service';
import { loggedMinutesForTicket } from '@/modules/time/services/time.service';
import { STATUS_LABELS } from '@/modules/tickets/labels';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSignedInUser();
  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!user.permissions.includes('ticket.read.own'))
    return Response.json({ error: 'Not allowed.' }, { status: 403 });
  const { id } = await params;
  const preview = await asUser(user, async () => {
    const ticket = await getTicketDetail(id);
    if (!ticket || (!user.permissions.includes('ticket.read.all') && ticket.assigneeId !== user.id))
      return null;
    const messages = ticket.messages.filter(
      (message) => message.visibility === 'public' || user.permissions.includes('ticket.manage'),
    );
    const latest = messages.at(-1);
    return {
      number: ticket.number,
      subject: ticket.subject,
      status: STATUS_LABELS[ticket.status],
      priority: ticket.priority,
      queue: ticket.queueName,
      customer: ticket.organisationName,
      contact: ticket.contactName ?? ticket.requester,
      assignee: ticket.assigneeName,
      brief: (messages.find((message) => message.visibility === 'public')?.body ?? '').slice(
        0,
        1200,
      ),
      latest: latest
        ? {
            body: latest.body.slice(0, 800),
            author: latest.authorName,
            internal: latest.visibility === 'internal',
          }
        : null,
      attachmentCount: messages.reduce((total, message) => total + message.attachments.length, 0),
      loggedMinutes: await loggedMinutesForTicket(id),
      lastActivityAt: ticket.lastActivityAt.toISOString(),
    };
  });
  return preview
    ? Response.json(preview, { headers: { 'Cache-Control': 'no-store' } })
    : Response.json({ error: 'Ticket not found.' }, { status: 404 });
}
