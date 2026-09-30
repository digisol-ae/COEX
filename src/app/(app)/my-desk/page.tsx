import { officeDate } from '@/modules/tasks/office-day';
import { asUser, requirePermission } from '@/lib/session';
import { listTasks } from '@/modules/tasks/services/task.service';
import { listSpaces } from '@/modules/tasks/services/space.service';
import { listUsers } from '@/modules/core/services/user.service';
import { getRunningTimer } from '@/modules/time/services/time.service';
import { listMyDeskHistory, loadMyDesk } from '@/modules/tasks/services/desk.service';
import { PageHeader } from '@/components/ui';
import { AvailableDeskTasks, MyDesk } from '../dashboard/my-desk';
import { TaskList } from '../tasks/task-list';
import { MyDeskTabs } from './my-desk-tabs';

export const metadata = { title: 'My desk · COEX' };
export default async function MyDeskPage() {
  const user = await requirePermission('task.read.own');
  const data = await asUser(user, async () => ({
    desk: await loadMyDesk(),
    history: await listMyDeskHistory(),
    availableTasks: await listTasks({ assigneeId: user.id }),
    spaces: await listSpaces(),
    users: await listUsers(),
    runningTimer: await getRunningTimer(),
  }));
  const selected = new Set(data.desk.selectedIds);
  const columnsBySpace = Object.fromEntries(data.spaces.map((space) => [space.id, space.statuses]));
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="My desk"
        description="Choose the work you commit to today. Only these tasks are measured when you finish your day."
      />
      <MyDeskTabs
        history={data.history}
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
