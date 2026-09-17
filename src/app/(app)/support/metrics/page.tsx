import { asUser, requirePermission } from '@/lib/session';
import {
  loadDeskMetrics,
  metPercent,
  type DeskRow,
} from '@/modules/tickets/services/metrics.service';
import { listQueues } from '@/modules/tickets/services/queue.service';
import { formatWorkingMinutes } from '@/modules/tickets/business-hours';
import { Card, CardSection, EmptyState, PageHeader } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { MetricsFilters } from './filters';

export const metadata = { title: 'Desk report · COEX' };

/**
 * How the desk is doing.
 *
 * Medians rather than averages: one ticket left over a public holiday drags an average past every
 * target while nine customers in ten were answered in minutes. The median says what the ordinary
 * customer experienced, and the missed counts say how often the promise was broken. Between them
 * there is nothing to explain away.
 */
export default async function DeskMetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; queue?: string }>;
}) {
  const actor = await requirePermission('ticket.read.all');
  const params = await searchParams;

  const to = params.to ? new Date(`${params.to}T23:59:59`) : new Date();
  const from = params.from
    ? new Date(`${params.from}T00:00:00`)
    : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);

  const { metrics, queues } = await asUser(actor, async () => ({
    metrics: await loadDeskMetrics({ from, to, queueId: params.queue || undefined }),
    queues: await listQueues(),
  }));

  const measured = metrics.totals.resolved + metrics.totals.open;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Desk report"
        description="Tickets raised in the window, and what happened to them. Times are working hours on the tenant calendar, the same clock the targets use."
      />

      <div className="mt-3">
        <MetricsFilters
          from={toInputDate(from)}
          to={toInputDate(to)}
          queue={params.queue ?? ''}
          queues={queues.map((queue) => ({ id: queue.id, name: queue.name }))}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <Tile label="Raised" value={String(measured)} detail="in the window" />
        <Tile
          label="First reply met"
          value={percentText(metrics.totals.firstResponseMet, metrics.totals.firstResponseMissed)}
          detail={`${metrics.totals.firstResponseMissed} missed`}
          isAlert={metrics.totals.firstResponseMissed > 0}
        />
        <Tile
          label="Resolution met"
          value={percentText(metrics.totals.resolutionMet, metrics.totals.resolutionMissed)}
          detail={`${metrics.totals.resolutionMissed} missed`}
          isAlert={metrics.totals.resolutionMissed > 0}
        />
        <Tile
          label="Open right now"
          value={String(metrics.breachedOpen + metrics.unassignedOpen)}
          detail={`${metrics.breachedOpen} past target, ${metrics.unassignedOpen} unassigned`}
          isAlert={metrics.breachedOpen > 0}
        />
      </div>

      <Card className="mt-4">
        <CardSection title="By person">
          {metrics.byAgent.length === 0 ? (
            <EmptyState message="No tickets were raised in this window." />
          ) : (
            <RowTable rows={metrics.byAgent} withAvatar />
          )}
        </CardSection>
      </Card>

      <Card className="mt-4">
        <CardSection title="By queue">
          {metrics.byQueue.length === 0 ? (
            <EmptyState message="No tickets were raised in this window." />
          ) : (
            <RowTable rows={metrics.byQueue} />
          )}
        </CardSection>
      </Card>
    </div>
  );
}

function RowTable({ rows, withAvatar }: { rows: DeskRow[]; withAvatar?: boolean }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="text-[11px] tracking-wide text-[var(--color-ink-subtle)] uppercase">
          <th className="border-b border-[var(--color-line)] px-2 py-1.5 text-left font-medium">
            Name
          </th>
          <th className="w-20 border-b border-[var(--color-line)] px-2 py-1.5 text-right font-medium">
            Open
          </th>
          <th className="w-20 border-b border-[var(--color-line)] px-2 py-1.5 text-right font-medium">
            Closed
          </th>
          <th className="w-28 border-b border-[var(--color-line)] px-2 py-1.5 text-right font-medium">
            Reply met
          </th>
          <th className="w-28 border-b border-[var(--color-line)] px-2 py-1.5 text-right font-medium">
            Resolve met
          </th>
          <th className="w-32 border-b border-[var(--color-line)] px-2 py-1.5 text-right font-medium">
            Median reply
          </th>
          <th className="w-32 border-b border-[var(--color-line)] px-2 py-1.5 text-right font-medium">
            Median resolve
          </th>
        </tr>
      </thead>

      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-[var(--color-line)] last:border-b-0">
            <td className="px-2 py-2">
              <span className="flex items-center gap-2">
                {withAvatar && row.name !== 'Unassigned' ? (
                  <Avatar name={row.name} size="small" />
                ) : null}
                <span
                  className={
                    row.name === 'Unassigned'
                      ? 'text-[var(--color-status-warn)]'
                      : 'text-[var(--color-ink)]'
                  }
                >
                  {row.name}
                </span>
              </span>
            </td>

            <td className="px-2 py-2 text-right text-[var(--color-ink-muted)] tabular-nums">
              {row.open}
            </td>
            <td className="px-2 py-2 text-right text-[var(--color-ink-muted)] tabular-nums">
              {row.resolved}
            </td>

            <td className="px-2 py-2 text-right tabular-nums">
              <Percent met={row.firstResponseMet} missed={row.firstResponseMissed} />
            </td>
            <td className="px-2 py-2 text-right tabular-nums">
              <Percent met={row.resolutionMet} missed={row.resolutionMissed} />
            </td>

            <td className="px-2 py-2 text-right text-[var(--color-ink-muted)] tabular-nums">
              {row.medianFirstResponseMinutes === null
                ? '—'
                : formatWorkingMinutes(row.medianFirstResponseMinutes)}
            </td>
            <td className="px-2 py-2 text-right text-[var(--color-ink-muted)] tabular-nums">
              {row.medianResolutionMinutes === null
                ? '—'
                : formatWorkingMinutes(row.medianResolutionMinutes)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Percent({ met, missed }: { met: number; missed: number }) {
  const value = metPercent(met, missed);

  if (value === null) return <span className="text-[var(--color-ink-subtle)]">—</span>;

  return (
    <span
      className={
        value >= 90
          ? 'text-[var(--color-ink-muted)]'
          : value >= 75
            ? 'text-[var(--color-status-warn)]'
            : 'text-[var(--color-status-alert)]'
      }
    >
      {value}%
    </span>
  );
}

function Tile({
  label,
  value,
  detail,
  isAlert,
}: {
  label: string;
  value: string;
  detail: string;
  isAlert?: boolean;
}) {
  return (
    <Card>
      <CardSection>
        <p className="text-[11px] tracking-wide text-[var(--color-ink-subtle)] uppercase">
          {label}
        </p>
        <p
          className={`mt-1 text-2xl tabular-nums ${
            isAlert ? 'text-[var(--color-status-alert)]' : 'text-[var(--color-ink)]'
          }`}
        >
          {value}
        </p>
        <p className="text-[11px] text-[var(--color-ink-subtle)]">{detail}</p>
      </CardSection>
    </Card>
  );
}

function percentText(met: number, missed: number): string {
  const value = metPercent(met, missed);
  return value === null ? '—' : `${value}%`;
}

function toInputDate(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
