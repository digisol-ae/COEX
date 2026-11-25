import { redirect } from 'next/navigation';
import { getSignedInUser } from '@/lib/session';
import Link from 'next/link';
import { AuthShell } from './login/auth-shell';
import { DEFAULT_TRIAL_DAYS, formatStorage } from '@coex/shared/core/saas';
import { provisioningDefaults } from '@/modules/core/services/platform-settings.service';

export default async function HomePage() {
  const user = await getSignedInUser();
  if (user)
    redirect(
      user.workspaceAccess && user.workspaceAccess !== 'allowed'
        ? '/workspace-status'
        : user.role === 'client_contact'
          ? '/portal'
          : '/dashboard',
    );
  // Keep the public entry available if the database is temporarily unavailable.
  const defaults = await provisioningDefaults().catch(() => ({
    trialDays: DEFAULT_TRIAL_DAYS,
    storageLimitBytes: 2_000_000_000,
  }));
  return (
    <AuthShell
      title="Your company’s work, connected."
      intro="Manage tasks, customer relationships and support tickets in one company workspace."
    >
      <div className="mt-7 space-y-5">
        <p className="text-sm text-[var(--color-ink-muted)]">
          Apply for a {defaults.trialDays}-day trial with{' '}
          {formatStorage(defaults.storageLimitBytes)} of file storage. Every application is reviewed
          before access is granted.
        </p>
        <div className="grid gap-3">
          <Link
            href="/register"
            className="rounded-[var(--radius-control)] bg-[var(--color-action)] px-4 py-3 text-center font-medium text-[var(--color-ink-inverse)]"
          >
            Apply for a trial
          </Link>
          <Link
            href="/login?view=staff"
            className="rounded-[var(--radius-control)] border border-[var(--color-line-strong)] px-4 py-3 text-center font-medium"
          >
            Log in
          </Link>
        </div>
        <p className="text-sm text-[var(--color-ink-muted)]">
          Here to submit a support request? Use your company’s customer portal or{' '}
          <Link href="/login" className="underline">
            customer login
          </Link>
          .
        </p>
      </div>
    </AuthShell>
  );
}
