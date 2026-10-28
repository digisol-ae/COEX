import { parallel } from '@/lib/parallel';
import { asUser, requirePermission } from '@/lib/session';
import { loadTimesheet } from '@/modules/time/services/timesheet.service';
import { listStaffUsers } from '@/modules/core/services/staff.service';
import { listTasks } from '@/modules/tasks/services/task.service';
import { listTickets } from '@/modules/tickets/services/ticket.service';
import { PageHeader } from '@/components/ui';
import { Timesheet } from './timesheet';

export const metadata = { title: 'Timesheet · Worktello' };

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

  const canSeeOthers = actor.permissions.includes('timesheet.read.all');
  const seesEveryTask = actor.permissions.includes('task.read.all');
  const subject = canSeeOthers && params.user ? params.user : actor.id;
  const week = params.week ? new Date(params.week) : new Date();

  const { timesheet, users, tasks, assignedTasks, myTickets } = await asUser(actor, () =>
    parallel({
      timesheet: loadTimesheet(week, subject),
      users: canSeeOthers ? listStaffUsers() : [],
      tasks: listTasks({ assigneeId: seesEveryTask ? undefined : actor.id }),
      // Open work assigned to me, so it can be listed with no hours before any timer is started.
      assignedTasks: listTasks({ assigneeId: actor.id }),
      myTickets: actor.permissions.includes('ticket.read.own')
        ? listTickets({ assigneeId: actor.id, openOnly: true, limit: 0 })
        : [],
    }),
  );

  // Tasks and tickets share one picker; the prefix says which a choice is.
  const items = [
    ...tasks.map((task) => ({ key: `task:${task.id}`, label: `${task.number} ${task.title}` })),
    ...myTickets.map((ticket) => ({
      key: `ticket:${ticket.id}`,
      label: `${ticket.number} ${ticket.subject}`,
    })),
  ];
  const assignedKeys = [
    ...assignedTasks.map((task) => `task:${task.id}`),
    ...myTickets.map((ticket) => `ticket:${ticket.id}`),
  ];

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
        items={items}
        assignedKeys={assignedKeys}
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
