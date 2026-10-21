import { LiveRefresh } from '@/components/ui/live-refresh';
import Link from 'next/link';
import { asUser, getSignedInUser } from '@/lib/session';
import { portalIdentity, portalTickets } from '@/modules/portal/service';
import { PageHeader, Notice, Input, Button, Select } from '@/components/ui';
import { STATUS_LABELS } from '@/modules/tickets/labels';
import { formatDateTime } from '@coex/shared/tasks/dates';
export const metadata = { title: 'Customer portal · COEX' };
export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; status?: string }>;
}) {
  const user = await getSignedInUser();
  if (!user || user.role !== 'client_contact')
    return (
      <>
        <PageHeader
          title="Create Support Ticket"
          description="Raise a support request and follow your own tickets in one place."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] p-4">
            <h2 className="font-semibold">Your support tickets</h2>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              See progress, read replies and share screenshots with support.
            </p>
          </section>
          <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] p-4">
            <h2 className="font-semibold">Customer sign-in</h2>
            <p className="my-2 text-sm text-[var(--color-ink-muted)]">
              Use the account provided by your support team. Contact support if you need access.
            </p>
            <Link href={user ? '/dashboard' : '/login'} className="font-medium underline">
              {user ? 'Back to COEX' : 'Sign in to create a support ticket'}
            </Link>
          </section>
        </div>
      </>
    );
  const params = await searchParams;
  let data;
  try {
    data = await asUser(user, async () => ({
      identity: await portalIdentity(),
      list: await portalTickets(params.q, Number(params.page ?? 1), params.status),
    }));
  } catch (error) {
    return (
      <Notice tone="warn">{error instanceof Error ? error.message : 'Portal unavailable.'}</Notice>
    );
  }
  const { list, identity } = data;
  const query = new URLSearchParams({ q: params.q ?? '', status: params.status ?? '' });
  return (
    <>
      <PageHeader
        title="My tickets"
        descriptionInline
        description={identity.organisation.name}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <LiveRefresh />
            <Link
              href="/portal/new"
              className="rounded-[var(--radius-control)] bg-[var(--color-action)] px-3 py-2 text-sm font-medium text-[var(--color-ink-inverse)]"
            >
              Raise ticket
            </Link>
          </div>
        }
      />
      <form className="coex-filters flex flex-wrap gap-1.5">
        <Input
          name="q"
          aria-label="Search my tickets"
          placeholder="Search my tickets"
          defaultValue={params.q}
        />
        <Select name="status" aria-label="Ticket status" defaultValue={params.status ?? ''}>
          <option value="">All tickets</option>
          <option value="open">Open tickets</option>
          <option value="closed">Resolved / Closed</option>
        </Select>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>
      <p className="text-xs text-[var(--color-ink-muted)]">
        {list.total} tickets · Only your own tickets are shown.
      </p>
      <ul className="divide-y divide-[var(--color-line)] rounded-[var(--radius-card)] border border-[var(--color-line)]">
        {list.tickets.length ? (
          list.tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={`/portal/tickets/${t.id}`}
                className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-[var(--color-surface-muted)]"
              >
                <div>
                  <p className="text-xs text-[var(--color-ink-muted)]">
                    {t.number} · {formatDateTime(t.createdAt)}
                  </p>
                  <p className="font-medium">{t.subject}</p>
                </div>
                <span className="rounded-full border border-[var(--color-line)] px-2 py-0.5 text-xs">
                  {STATUS_LABELS[t.status as keyof typeof STATUS_LABELS] ?? t.status}
                </span>
              </Link>
            </li>
          ))
        ) : (
          <li className="p-4 text-sm text-[var(--color-ink-muted)]">No tickets found.</li>
        )}
      </ul>
      <div className="flex justify-between text-sm">
        {list.page > 1 ? (
          <Link href={`/portal?${query}&page=${list.page - 1}`}>Previous</Link>
        ) : (
          <span />
        )}
        {list.page * 25 < list.total ? (
          <Link href={`/portal?${query}&page=${list.page + 1}`}>Next</Link>
        ) : null}
      </div>
    </>
  );
}
