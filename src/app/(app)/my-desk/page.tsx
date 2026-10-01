import { officeDate } from '@/modules/tasks/office-day';
import { asUser, requirePermission } from '@/lib/session';
import { listTasks } from '@/modules/tasks/services/task.service';
import { listSpaces } from '@/modules/tasks/services/space.service';
import { listUsers } from '@/modules/core/services/user.service';
import { getRunningTimer } from '@/modules/time/services/time.service';
import {
  listMyDeskHistory,
  listTeamDeskHistory,
  loadMyDesk,
} from '@/modules/tasks/services/desk.service';
import { PageHeader } from '@/components/ui';
import { AvailableDeskTasks, MyDesk } from '../dashboard/my-desk';
import { TaskList } from '../tasks/task-list';
import { MyDeskTabs } from './my-desk-tabs';
import { TeamHistory } from './team-history';

export const metadata = { title: 'My desk · COEX' };
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** A calendar date key some days earlier; noon UTC keeps the arithmetic off any day boundary. */
function daysBefore(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export default async function MyDeskPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; person?: string; from?: string; to?: string }>;
}) {
  const user = await requirePermission('task.read.own');
  const params = await searchParams;
  const canSeeTeam = user.permissions.includes('desk.read.all');
  const view = params.view === 'team' || params.view === 'history' ? params.view : 'today';
  const to = params.to && DATE_KEY.test(params.to) ? params.to : officeDate();
  const from = params.from && DATE_KEY.test(params.from) ? params.from : daysBefore(to, 29);
  const data = await asUser(user, async () => ({
    desk: await loadMyDesk(),
    history: await listMyDeskHistory(),
    availableTasks: await listTasks({ assigneeId: user.id }),
    spaces: await listSpaces(),
    users: await listUsers(),
    runningTimer: await getRunningTimer(),
  }));
  // Everyone, suspended people included, so a former colleague's history stays reachable.
  const people = data.users.map(({ id, name }) => ({ id, name }));
  const personId =
    params.person && data.users.some((person) => person.id === params.person)
      ? params.person
      : null;
  // Loaded only for people who may see it; a chosen person shows their whole history.
  const teamRows = canSeeTeam
    ? await asUser(user, () => listTeamDeskHistory(personId ? { userId: personId } : { from, to }))
    : [];
  const selected = new Set(data.desk.selectedIds);
  const columnsBySpace = Object.fromEntries(data.spaces.map((space) => [space.id, space.statuses]));
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="My desk"
        description="Choose the work you commit to today. Only these tasks are measured when you finish your day."
      />
      <MyDeskTabs
        initialTab={view}
        history={data.history}
        team={
          canSeeTeam ? (
            <TeamHistory rows={teamRows} people={people} personId={personId} from={from} to={to} />
          ) : undefined
        }
        today={
          <>
            <MyDesk
              confirmedToday={data.history.some((item) => item.workDate === officeDate())}
              tasks={data.desk.tasks}
              score={data.desk.score}
            >
              {data.desk.tasks.length ? (
                <TaskList
                  tasks={data.desk.tasks}
                  users={data.users.map(({ id, name }) => ({ id, name }))}
                  columnsBySpace={columnsBySpace}
                  canManage={user.permissions.includes('task.manage')}
                  runningTaskId={
                    data.runningTimer?.kind === 'task' ? data.runningTimer.itemId : null
                  }
                  deskActionLabel="Remove"
                  hideAssignees
                />
              ) : null}
            </MyDesk>
            <AvailableDeskTasks tasks={data.availableTasks.filter((t) => !selected.has(t.id))} />
          </>
        }
      />
    </div>
  );
}
