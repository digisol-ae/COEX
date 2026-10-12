import { asUser, getSignedInUser } from '@/lib/session';
import { searchTickets } from '@/modules/tickets/services/ticket.service';
import { STATUS_LABELS } from '@/modules/tickets/labels';

/**
 * Finding a ticket by number or subject, for linking and merging.
 *
 * Nobody remembers a database id, and asking someone to paste one from an address bar is how a
 * ticket gets merged into the wrong conversation. The search runs through the service, so tenant
 * scoping applies exactly as it does on the screens.
 */
export async function GET(request: Request) {
  const user = await getSignedInUser();

  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!user.permissions.includes('ticket.read.own')) {
    return Response.json({ error: 'Not allowed.' }, { status: 403 });
  }

  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';
  const exclude = url.searchParams.get('exclude') ?? undefined;

  if (query.length < 2) return Response.json({ results: [] });

  const results = await asUser(user, () => searchTickets(query, exclude));

  return Response.json({
    results: results.map((ticket) => ({
      id: ticket.id,
      number: ticket.number,
      subject: ticket.subject,
      status: STATUS_LABELS[ticket.status],
      customer: ticket.organisationName,
    })),
  });
}
