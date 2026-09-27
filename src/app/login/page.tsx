import { redirect } from 'next/navigation';
import { getSignedInUser } from '@/lib/session';
import { LoginForm } from './login-form';
import { AuthShell } from './auth-shell';

export const metadata = { title: 'Sign in to COEX' };

export default async function LoginPage() {
  const user = await getSignedInUser();
  if (user) redirect('/dashboard');

  return (
    <AuthShell
      title="Sign in"
      intro="Use your COEX account. Microsoft sign in arrives once the DigiSol tenant is registered."
    >
      <LoginForm />
    </AuthShell>
  );
}
