import Link from 'next/link';

/** Friendly guidance for customers arriving from the previous support portal. */
export function CustomerWelcome() {
  return (
    <aside
      aria-label="Welcome from our previous support portal"
      className="mt-6 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-ink-muted)]"
    >
      <h2 className="font-semibold text-[var(--color-ink)]">
        Welcome to your new DigiSol support home!
      </h2>
      <p className="mt-2">
        Moving from our previous portal? If you had a registered account, you can continue with your
        existing email or username and password.
      </p>
      <p className="mt-2">
        Forgotten your password or having trouble signing in?{' '}
        <Link href="/email-login" className="font-medium underline underline-offset-2">
          Get a one-time code by email
        </Link>{' '}
        or{' '}
        <Link href="/forgot-password" className="font-medium underline underline-offset-2">
          reset your password
        </Link>{' '}
        using your registered email. We&apos;re here to help!
      </p>
    </aside>
  );
}
