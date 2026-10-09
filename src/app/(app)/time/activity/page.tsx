import Link from 'next/link';
import { asUser, requirePermission } from '@/lib/session';
import { listUsers } from '@/modules/core/services/user.service';
import { listSpaces } from '@/modules/tasks/services/space.service';
import { listTeamActivity } from '@/modules/time/services/activity.service';
import { STATUS_LABELS } from '@/modules/tickets/labels';
import { todayKey } from '@/modules/crm/contract-status';
import { formatMinutes } from '@/modules/time/week';
import { formatDateTime } from '@/modules/tasks/dates';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
} from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { LiveRefresh } from '@/components/ui/live-refresh';

export const metadata = { title: 'Team activity · COEX' };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Who is working on which task or ticket, and what stage it is in (John, 9 Oct 2026).
 *
 * Built from recorded time, so it shows people who track their work; someone who never starts a
 * timer or logs time does not appear. Only people allowed to see everyone's hours may open it,
 * because it shows the same information as the all timesheets page, by item instead of by day.
 */
export default async function TeamActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string; person?: string }>;
}) {
  const actor = await requirePermission('timesheet.read.all');
  const params = await searchParams;

  const today = todayKey();
  const fromDay = params.from && DAY.test(params.from) ? params.from : today;
  const toDay = params.to && DAY.test(params.to) ? params.to : fromDay;
  const [from, to] = fromDay <= toDay ? [fromDay, toDay] : [toDay, fromDay];

  const { rows, users, spaces } = await asUser(actor, async () => ({
    rows: await listTeamActivity({
      fromDay: from,
      toDay: to,
      userId: params.person || undefined,
      status: params.status || undefined,
    }),
    users: (await listUsers()).filter((user) => user.status === 'active'),
    spaces: await listSpaces(),
  }));

  const taskStages = [...new Set(spaces.flatMap((space) => space.statuses.map((s) => s.name)))];
  const working = rows.filter((row) => row.running).length;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Team activity"
        titleExtra={<LiveRefresh />}
        description="Who is working on which task or ticket, and the stage it is in. Based on timers and logged time."
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--color-ink-subtle)]">From</span>
          <Input type="date" name="from" defaultValue={from} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--color-ink-subtle)]">To</span>
          <Input type="date" name="to" defaultValue={to} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--color-ink-subtle)]">Stage or status</span>
          <Select name="status" defaultValue={params.status ?? ''}>
            <option value="">Any</option>
            <optgroup label="Task stages">
              {taskStages.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </optgroup>
            <optgroup label="Ticket statuses">
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </optgroup>
          </Select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--color-ink-subtle)]">Person</span>
          <Select name="person" defaultValue={params.person ?? ''}>
            <option value="">Everyone</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit">Apply</Button>
        <Link
          href="/time/activity"
          className="py-2 text-xs text-[var(--color-ink-muted)] underline"
        >
          Today
        </Link>
      </form>

      <p className="mb-2 text-xs text-[var(--color-ink-subtle)]">
        {rows.length} {rows.length === 1 ? 'row' : 'rows'}
        {working > 0 ? ` · ${working} working right now` : ''}
      </p>

      <Card>
        {rows.length === 0 ? (
          <EmptyState message="No time recorded for these days and filters. People who work without a timer or logged time do not show here." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Person</Th>
                <Th>Task or ticket</Th>
                <Th>Stage</Th>
                <Th>Time</Th>
                <Th>Last worked</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={`${row.userId}:${row.kind}:${row.itemId}`}
                  data-sort-values={JSON.stringify([
                    row.userName,
                    row.number,
                    row.kind === 'ticket'
                      ? (STATUS_LABELS as Record<string, string>)[row.status]
                      : row.status,
                    row.minutes,
                    row.lastWorkedAt.getTime(),
                  ])}
                  className="border-b border-[var(--color-line)] last:border-b-0"
                >
                  <Td>
                    <span className="flex items-center gap-2">
                      <Avatar name={row.userName} size="small" />
                      {row.userName}
                    </span>
                  </Td>
                  <Td>
                    <Link
                      href={
                        row.kind === 'task'
                          ? `/tasks/${row.itemId}`
                          : `/support/tickets/${row.itemId}`
                      }
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {row.number} {row.title}
                    </Link>
                    <p className="text-[11px] text-[var(--color-ink-subtle)]">
                      {row.kind === 'task' ? `Task · ${row.context ?? ''}` : 'Ticket'}
                    </p>
                  </Td>
                  <Td>
                    {row.kind === 'ticket'
                      ? ((STATUS_LABELS as Record<string, string>)[row.status] ?? row.status)
                      : row.status}
                  </Td>
                  <Td>
                    {formatMinutes(row.minutes)}{' '}
                    {row.running ? <Badge tone="ok">working now</Badge> : null}
                  </Td>
                  <Td>{row.running ? 'Now' : formatDateTime(row.lastWorkedAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
