import { redirect } from 'next/navigation';
import { getSignedInUser } from '@/lib/session';
import { LoginEntry } from './login-entry';
import { isEntraConfigured } from '@/modules/core/services/entra.service';

export const metadata = { title: 'Sign in to Worktello' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ entra?: string }>;
}) {
  const user = await getSignedInUser();
  if (user) redirect(user.role === 'client_contact' ? '/portal' : '/dashboard');
  const params = await searchParams;

  return <LoginEntry entraEnabled={isEntraConfigured()} entraError={params.entra} />;
}
