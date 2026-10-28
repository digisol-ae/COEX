import { asUser, getSignedInUser } from '@/lib/session';
import { searchTicketPeople } from '@/modules/crm/services/ticket-people.service';

/** People found on tickets, for linking to a customer as contacts. */
export async function GET(request: Request) {
  const user = await getSignedInUser();

  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (user.role === 'client_contact')
    return Response.json({ error: 'Not allowed.' }, { status: 403 });
  if (
    !user.permissions.includes('customer.manage') ||
    !user.permissions.includes('ticket.read.all')
  ) {
    return Response.json({ error: 'Not allowed.' }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const organisationId = params.get('organisationId') ?? '';
  if (!/^[a-f0-9]{24}$/i.test(organisationId)) {
    return Response.json({ error: 'Choose a customer.' }, { status: 400 });
  }

  try {
    const result = await asUser(user, () =>
      searchTicketPeople(organisationId, params.get('q') ?? ''),
    );
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Search failed.' },
      { status: 400 },
    );
  }
}
