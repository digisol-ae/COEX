import Link from 'next/link';
import { asUser, requirePermission } from '@/lib/session';
import { listTasks } from '@/modules/tasks/services/task.service';
import { Card, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { Chip, PriorityFlag, StatusPill } from '@/components/ui/pill';
import { formatDateTime } from '@/modules/tasks/dates';
import { formatMinutes } from '@/modules/time/week';
import { TaskFilters } from './filters';

export const metadata = { title: 'Tasks · COEX' };

/**
 * Every open task the signed in person is allowed to see, filtered from the address bar so a view
 * can be bookmarked. An agent sees their own work; a manager sees the tenant.
 */
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ mine?: string; overdue?: string; unassigned?: string; closed?: string }>;
}) {
  const actor = await requirePermission('task.read.own');
  const params = await searchParams;

  const seesEverything = actor.permissions.includes('task.read.all');
  const mine = params.mine === '1' || !seesEverything;

  const tasks = await asUser(actor, () =>
    listTasks({
      assigneeId: mine ? actor.id : undefined,
      overdueOnly: params.overdue === '1',
      unassignedOnly: params.unassigned === '1',
      includeClosed: params.closed === '1',
    }),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Tasks"
        description={
          seesEverything
            ? 'Everything open across every portfolio, unless you narrow it below.'
            : 'The work assigned to you.'
        }
      />

      <TaskFilters
        mine={mine}
        overdue={params.overdue === '1'}
        unassigned={params.unassigned === '1'}
        closed={params.closed === '1'}
        canSeeAll={seesEverything}
      />

      <Card className="mt-4">
        {tasks.length === 0 ? (
          <EmptyState message="Nothing here. Either the work is done or the filters are too narrow." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{''}</Th>
                <Th>Task</Th>
                <Th>Status</Th>
                <Th>Project</Th>
                <Th>Schedule</Th>
                <Th>Who</Th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="group hover:bg-[var(--color-surface-muted)]/60">
                  <Td className="w-8 pr-0">
                    <PriorityFlag priority={task.priority} />
                  </Td>

                  <Td className="max-w-sm">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="block truncate font-medium text-[var(--color-ink)] underline-offset-4 group-hover:underline"
                    >
                      {task.title}
                    </Link>
                    <span className="font-mono text-[11px] text-[var(--color-ink-subtle)]">
                      {task.number}
                    </span>
                    {task.subtaskCount > 0 ? (
                      <span className="ml-2 text-[11px] text-[var(--color-ink-subtle)]">
                        {task.subtasksDone}/{task.subtaskCount} subtasks
                      </span>
                    ) : null}
                  </Td>

                  <Td>
                    <StatusPill status={task.status} isClosed={task.isClosed} />
                  </Td>

                  <Td className="text-[var(--color-ink-muted)]">
                    <span className="block truncate text-sm">{task.projectName}</span>
                    {task.phase ? (
                      <span className="text-[11px] text-[var(--color-ink-subtle)]">
                        {task.phase}
                      </span>
                    ) : null}
                  </Td>

                  <Td>
                    <div className="flex flex-wrap items-center gap-1">
                      {task.endAt ? (
                        <Chip tone={task.isOverdue ? 'alert' : 'neutral'} title="Ends">
                          {formatDateTime(task.endAt)}
                        </Chip>
                      ) : null}
                      {task.plannedMinutes ? (
                        <Chip title="Planned working hours">
                          {formatMinutes(task.plannedMinutes)}
                        </Chip>
                      ) : null}
                    </div>
                  </Td>

                  <Td>
                    {task.assigneeNames.length ? (
                      <div className="flex -space-x-1.5">
                        {task.assigneeNames.map((name) => (
                          <Avatar key={name} name={name} size="small" />
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-[var(--color-ink-subtle)]">Unassigned</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
