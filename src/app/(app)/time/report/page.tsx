import Link from 'next/link';
import { asUser, requirePermission } from '@/lib/session';
import { loadTotals } from '@/modules/time/services/timesheet.service';
import { formatMinutes, startOfWeek } from '@/modules/time/week';
import { Card, CardSection, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';
import { PeriodPicker } from './period-picker';

export const metadata = { title: 'Time report · COEX' };

/**
 * Where the hours went, three ways.
 *
 * Billable is shown beside total everywhere rather than as a separate report, because the useful
 * question is never "how many hours" on its own.
 */
export default async function TimeReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const actor = await requirePermission('task.read.all');
  const params = await searchParams;

  const from = params.from ? new Date(params.from) : startOfWeek(new Date());
  const to = params.to ? new Date(params.to) : new Date();
  const toExclusive = new Date(to);
  toExclusive.setHours(23, 59, 59, 999);

  const totals = await asUser(actor, () => loadTotals(from, toExclusive));

  const exportHref = `/time/report/export?from=${from.toISOString().slice(0, 10)}&to=${to
    .toISOString()
    .slice(0, 10)}`;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Time report"
        description="Hours by person, space and customer for the period, with billable shown beside each total."
        action={
          <Link
            href={exportHref}
            className="rounded-[var(--radius-control)] border border-[var(--color-line-strong)] px-4 py-2 text-sm text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
          >
            Export CSV
          </Link>
        }
      />

      <PeriodPicker from={from.toISOString().slice(0, 10)} to={to.toISOString().slice(0, 10)} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="px-4 py-3">
          <p className="text-xs font-medium tracking-wide text-[var(--color-ink-subtle)] uppercase">
            Total
          </p>
          <p className="mt-1 text-lg font-medium text-[var(--color-ink)] tabular-nums">
            {formatMinutes(totals.totalMinutes)}
          </p>
        </Card>

        <Card className="px-4 py-3">
          <p className="text-xs font-medium tracking-wide text-[var(--color-ink-subtle)] uppercase">
            Billable
          </p>
          <p className="mt-1 text-lg font-medium text-[var(--color-ink)] tabular-nums">
            {formatMinutes(totals.billableMinutes)}
          </p>
        </Card>
      </div>

      <div className="mt-6 space-y-6">
        <Group title="By person" rows={totals.byPerson} />
        <Group title="By space" rows={totals.bySpace} />
        <Group title="By customer" rows={totals.byCustomer} />
      </div>
    </div>
  );
}

function Group({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; label: string; minutes: number; billableMinutes: number }[];
}) {
  return (
    <Card>
      <CardSection title={title}>
        {rows.length === 0 ? (
          <EmptyState message="No time recorded in this period." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Hours</Th>
                <Th>Billable</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id || row.label}>
                  <Td className="text-[var(--color-ink)]">{row.label}</Td>
                  <Td className="tabular-nums text-[var(--color-ink-muted)]">
                    {formatMinutes(row.minutes)}
                  </Td>
                  <Td className="tabular-nums text-[var(--color-ink-muted)]">
                    {formatMinutes(row.billableMinutes)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </CardSection>
    </Card>
  );
}
