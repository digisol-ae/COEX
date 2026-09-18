import { asUser, getSignedInUser } from '@/lib/session';
import { listContacts } from '@/modules/crm/services/contact.service';

/** The contacts at one customer, for choosing who a ticket is being raised on behalf of. */
export async function GET(request: Request) {
  const user = await getSignedInUser();

  if (!user) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  if (!user.permissions.includes('customer.read')) {
    return Response.json({ error: 'Not allowed.' }, { status: 403 });
  }

  const organisationId = new URL(request.url).searchParams.get('organisationId');
  if (!organisationId) return Response.json({ contacts: [] });

  const contacts = await asUser(user, () => listContacts(organisationId));

  return Response.json({
    contacts: contacts
      .filter((contact) => contact.status === 'active')
      .map((contact) => ({ id: contact.id, name: contact.name, title: contact.title })),
  });
}
