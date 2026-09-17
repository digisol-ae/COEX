import Image from 'next/image';
import { redirect } from 'next/navigation';
import { getSignedInUser } from '@/lib/session';
import { LoginForm } from './login-form';

export const metadata = { title: 'Sign in to COEX' };

export default async function LoginPage() {
  const user = await getSignedInUser();
  if (user) redirect('/dashboard');

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Image
          src="/brand/logo-long.png"
          alt="DigiSol"
          width={180}
          height={40}
          priority
          className="mb-10 h-9 w-auto"
        />

        <h1 className="text-2xl font-bold text-[var(--color-ink)]">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Use your COEX account. Microsoft sign in arrives once the DigiSol tenant is registered.
        </p>

        <LoginForm />
      </div>
    </main>
  );
}
