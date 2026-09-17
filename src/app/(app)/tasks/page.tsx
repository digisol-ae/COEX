import Link from 'next/link';
import { asUser, requirePermission } from '@/lib/session';
import { listTasks } from '@/modules/tasks/services/task.service';
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';
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
                <Th>Number</Th>
                <Th>Task</Th>
                <Th>Project</Th>
                <Th>Status</Th>
                <Th>Assigned</Th>
                <Th>Due</Th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <Td className="font-mono text-xs text-[var(--color-ink-muted)]">{task.number}</Td>
                  <Td>
                    <Link
                      href={`/tasks/${task.id}`}
                      className="font-medium text-[var(--color-ink)] underline-offset-4 hover:underline"
                    >
                      {task.title}
                    </Link>
                    {task.priority === 'urgent' || task.priority === 'high' ? (
                      <Badge tone={task.priority === 'urgent' ? 'alert' : 'warn'}>
                        {task.priority}
                      </Badge>
                    ) : null}
                  </Td>
                  <Td className="text-[var(--color-ink-muted)]">{task.projectName}</Td>
                  <Td className="text-[var(--color-ink-muted)]">{task.status}</Td>
                  <Td className="text-[var(--color-ink-muted)]">
                    {task.assigneeNames.join(', ') || 'Unassigned'}
                  </Td>
                  <Td>
                    {task.dueDate ? (
                      <span
                        className={
                          task.isOverdue
                            ? 'text-[var(--color-status-alert)]'
                            : 'text-[var(--color-ink-muted)]'
                        }
                      >
                        {task.dueDate.toLocaleDateString('en-GB')}
                      </span>
                    ) : (
                      <span className="text-[var(--color-ink-subtle)]">—</span>
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
