import { redirect } from 'next/navigation';
import { getSignedInUser } from '@/lib/session';
import { LoginForm } from './login-form';
import { AuthShell } from './auth-shell';
import { isEntraConfigured } from '@/modules/core/services/entra.service';

export const metadata = { title: 'Sign in to COEX' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ entra?: string }>;
}) {
  const user = await getSignedInUser();
  if (user) redirect('/dashboard');
  const params = await searchParams;

  return (
    <AuthShell title="Sign in" intro="Use your COEX account to sign in.">
      <LoginForm entraEnabled={isEntraConfigured()} entraError={params.entra} />
    </AuthShell>
  );
}
