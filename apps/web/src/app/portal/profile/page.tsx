import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/session';
import { portalPath } from '@coex/shared/core/portal-links';
export default async function Page() {
  const user = await requireUser();
  if (user.role !== 'client_contact') redirect('/dashboard');
  if (!user.tenantSlug) redirect('/login');
  redirect(`${portalPath(user.tenantSlug)}/profile`);
}
