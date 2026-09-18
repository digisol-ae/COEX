import { asUser, requirePermission } from '@/lib/session';
import { loadTimesheet } from '@/modules/time/services/timesheet.service';
import { listUsers } from '@/modules/core/services/user.service';
import { listTasks } from '@/modules/tasks/services/task.service';
import { PageHeader } from '@/components/ui';
import { Timesheet } from './timesheet';

export const metadata = { title: 'Timesheet · COEX' };

/**
 * One person's week.
 *
 * A manager may look at anyone's timesheet; everyone else sees their own, and the service enforces
 * that rather than the page hiding a link.
 */
export default async function TimePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; user?: string }>;
}) {
  const actor = await requirePermission('task.read.own');
  const params = await searchParams;

  const canSeeOthers = actor.permissions.includes('task.read.all');
  const subject = canSeeOthers && params.user ? params.user : actor.id;
  const week = params.week ? new Date(params.week) : new Date();

  const { timesheet, users, tasks } = await asUser(actor, async () => ({
    timesheet: await loadTimesheet(week, subject),
    users: canSeeOthers ? await listUsers() : [],
    tasks: await listTasks({ assigneeId: canSeeOthers ? undefined : actor.id }),
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Timesheet"
        description="Time recorded against tasks. A locked week cannot be changed, which is what makes these figures worth quoting."
      />

      <Timesheet
        timesheet={{
          ...timesheet,
          weekStart: timesheet.weekStart.toISOString(),
          entries: timesheet.entries.map((entry) => ({
            ...entry,
            workDate: entry.workDate.toISOString(),
          })),
        }}
        tasks={tasks.map((task) => ({
          id: task.id,
          label: `${task.number} ${task.title}`,
        }))}
        users={users.map((user) => ({ id: user.id, name: user.name }))}
        canLock={actor.permissions.includes('tenant.manage')}
        canSeeOthers={canSeeOthers}
        viewingSelf={subject === actor.id}
        canEditThisSheet={subject === actor.id || actor.permissions.includes('tenant.manage')}
      />
    </div>
  );
}

export const dynamic = 'force-dynamic';
