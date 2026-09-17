import { requireUser } from '@/lib/session';

export const metadata = { title: 'Dashboard · COEX' };

/**
 * Placeholder dashboard. The real one arrives in M3 with the task tiles, and it is built in the
 * same milestone as the task record rather than afterwards.
 */
export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-[var(--color-ink)]">Welcome, {user.name}</h1>
      <p className="mt-2 text-[var(--color-ink-muted)]">
        Milestone one is in place: tenancy, sign in, roles and the audit log. Task tiles arrive in
        milestone three.
      </p>

      <dl className="mt-8 grid gap-4 sm:grid-cols-3">
        <Tile label="Tenant" value={user.tenantName} />
        <Tile label="Your role" value={user.role.replace('_', ' ')} />
        <Tile label="Permissions" value={String(user.permissions.length)} />
      </dl>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-4">
      <dt className="text-xs font-medium tracking-wide text-[var(--color-ink-subtle)] uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-medium text-[var(--color-ink)]">{value}</dd>
    </div>
  );
}
