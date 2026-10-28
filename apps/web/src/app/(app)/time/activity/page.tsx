import { RecordList } from '@/components/ui/record-window';
import { asUser, requirePermission } from '@/lib/session';
import { listStaffUsers } from '@/modules/core/services/staff.service';
import { listSpaces } from '@/modules/tasks/services/space.service';
import { listTasks } from '@/modules/tasks/services/task.service';
import { listTeamActivity, latestTeamWork } from '@/modules/time/services/activity.service';
import { activityQuery, parseActivityParams } from '@/modules/time/activity-filter';
import { STATUS_LABELS } from '@/modules/tickets/labels';
import { todayKey } from '@coex/shared/crm/contract-status';
import { formatMinutes } from '@coex/shared/time/week';
import { sinceLastActive } from '@coex/shared/time/last-active';
import { formatDateTime } from '@coex/shared/tasks/dates';
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { LiveRefresh } from '@/components/ui/live-refresh';
import { TicketSubjectLink } from '../../support/tickets/ticket-preview-button';
import { ActivityFilters } from './activity-filters';
import { ActivityTaskLink } from './activity-task-link';
import { ShareButton } from './share-button';

export const metadata = { title: 'Team activity · Worktello' };

const ticketLabel = (status: string) => (STATUS_LABELS as Record<string, string>)[status] ?? status;

/**
 * Who is working on which task or ticket, and what stage it is in (John, 9 Oct 2026).
 *
 * Built from recorded time, so it shows people who track their work; someone who never starts a
 * timer or logs time does not appear. Only people allowed to see everyone's hours may open it,
 * because it shows the same information as the all timesheets page, by item instead of by day.
 * Titles open the same quick preview popups as Tasks and Support, and Share sends it as a PDF.
 */
export default async function TeamActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requirePermission('timesheet.read.all');
  const params = await searchParams;

  const today = todayKey();
  const filter = parseActivityParams(params, today);
  const query = activityQuery(filter);

  const { rows, users, spaces, tasks, latest } = await asUser(actor, async () => {
    const rows = await listTeamActivity(filter);
    const taskIds = [
      ...new Set(rows.filter((row) => row.kind === 'task').map((row) => row.itemId)),
    ];

    return {
      rows,
      latest: await latestTeamWork(),
      users: (await listStaffUsers()).filter(
        (user) => user.status === 'active' && user.role !== 'client_contact',
      ),
      spaces: await listSpaces(),
      tasks: taskIds.length ? await listTasks({ ids: taskIds, includeClosed: true }) : [],
    };
  });

  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const taskStages = [...new Set(spaces.flatMap((space) => space.statuses.map((s) => s.name)))];
  const working = rows.filter((row) => row.running).length;

  // The same totals the PDF opens with, so the screen and the report agree.
  const minutesByPerson = new Map<string, number>();
  for (const row of rows) {
    minutesByPerson.set(row.userName, (minutesByPerson.get(row.userName) ?? 0) + row.minutes);
  }
  const personTotals = [...minutesByPerson.entries()].sort((a, b) => b[1] - a[1]);
  const totalMinutes = personTotals.reduce((sum, [, minutes]) => sum + minutes, 0);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Team activity"
        titleExtra={<LiveRefresh />}
        description="Who is working on which task or ticket, and the stage it is in. Based on timers and logged time."
        action={
          <ShareButton
            query={query}
            suggestions={users.map((user) => ({ name: user.name, email: user.email }))}
          />
        }
      />

      <ActivityFilters
        from={filter.fromDay}
        to={filter.toDay}
        todayHref={`/time/activity?${activityQuery({ ...filter, fromDay: today, toDay: today })}`}
        status={filter.status ?? ''}
        kinds={filter.kinds ?? ['task', 'ticket']}
        selectedPeople={filter.userIds ?? []}
        users={users.map((user) => ({ id: user.id, name: user.name }))}
        taskStages={taskStages}
        ticketStatuses={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
      />

      <section
        className="mb-4 rounded border border-[var(--color-line)] p-3"
        aria-label="Agent last activity"
      >
        <h2 className="text-sm font-medium">Since last active</h2>
        <p className="mb-2 text-xs text-[var(--color-ink-subtle)]">
          Latest timer or logged work across all dates. This records work, not online presence.
          Times use the office timezone.
        </p>
        <RecordList as="ul" className="divide-y divide-[var(--color-line)]">
          {users
            .filter((user) => !filter.userIds?.length || filter.userIds.includes(user.id))
            .map((user) => {
              const work = latest.get(user.id);
              return (
                <li key={user.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                  <span>{user.name}</span>
                  <span>
                    {sinceLastActive(work?.at ?? null, work?.running)}
                    {work ? (
                      <span className="ml-2 text-xs text-[var(--color-ink-subtle)]">
                        {formatDateTime(work.at)}
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
        </RecordList>
      </section>

      <p className="mb-2 text-xs text-[var(--color-ink-subtle)]">
        {rows.length} {rows.length === 1 ? 'row' : 'rows'}
        {working > 0 ? ` · ${working} working right now` : ''}
      </p>

      {rows.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-[var(--radius-control)] bg-[var(--color-surface-muted)] px-3 py-1.5 font-medium text-[var(--color-ink)]">
            Total {formatMinutes(totalMinutes)}
          </span>
          {personTotals.length > 1
            ? personTotals.map(([name, minutes]) => (
                <span
                  key={name}
                  className="rounded-[var(--radius-control)] border border-[var(--color-line)] px-3 py-1.5 text-[var(--color-ink-muted)]"
                >
                  {name}{' '}
                  <span className="tabular-nums text-[var(--color-ink)]">
                    {formatMinutes(minutes)}
                  </span>
                </span>
              ))
            : null}
        </div>
      ) : null}

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
                <Th>Since last active</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const task = row.kind === 'task' ? taskById.get(row.itemId) : undefined;
                const stage = row.kind === 'ticket' ? ticketLabel(row.status) : row.status;

                return (
                  <tr
                    key={`${row.userId}:${row.kind}:${row.itemId}`}
                    data-sort-values={JSON.stringify([
                      row.userName,
                      row.number,
                      stage,
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
                      {row.kind === 'ticket' ? (
                        <TicketSubjectLink
                          ticketId={row.itemId}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {row.number} {row.title}
                        </TicketSubjectLink>
                      ) : task ? (
                        <ActivityTaskLink task={task}>
                          {row.number} {row.title}
                        </ActivityTaskLink>
                      ) : (
                        <span className="font-medium">
                          {row.number} {row.title}
                        </span>
                      )}
                      <p className="text-[11px] text-[var(--color-ink-subtle)]">
                        {row.kind === 'task' ? `Task · ${row.context ?? ''}` : 'Ticket'}
                      </p>
                    </Td>
                    <Td>{stage}</Td>
                    <Td>
                      {formatMinutes(row.minutes)}{' '}
                      {row.running ? <Badge tone="ok">working now</Badge> : null}
                    </Td>
                    <Td>
                      <p>{sinceLastActive(row.lastWorkedAt, row.running)}</p>
                      <p className="text-xs text-[var(--color-ink-subtle)]">
                        {formatDateTime(row.lastWorkedAt)}
                      </p>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
