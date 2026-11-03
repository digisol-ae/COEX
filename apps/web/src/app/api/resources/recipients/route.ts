import { asUser, getSignedInUser } from '@/lib/session';
import { resourceRecipients } from '@/modules/resources/service';
import { PRIVATE_HEADERS } from '@/modules/resources/http';
export async function GET(request: Request) {
  const user = await getSignedInUser();
  if (
    !user ||
    user.role === 'client_contact' ||
    !user.permissions.includes('resource.share') ||
    !user.permissions.includes('customer.read')
  )
    return Response.json({ error: 'Not allowed.' }, { status: 403 });
  return Response.json(
    {
      recipients: await asUser(user, () =>
        resourceRecipients(new URL(request.url).searchParams.get('search') ?? ''),
      ),
    },
    { headers: PRIVATE_HEADERS },
  );
}
