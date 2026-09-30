import { asUser, requirePermission } from '@/lib/session';
import { listTasks } from '@/modules/tasks/services/task.service';
import { personalSpaceForCurrentUser } from '@/modules/tasks/services/space.service';
import { getRunningTimer } from '@/modules/time/services/time.service';
import { listUsers } from '@/modules/core/services/user.service';
import { PageHeader } from '@/components/ui';
import { PersonalTaskPanel } from '../tasks/personal-task-panel';
import { TaskList } from '../tasks/task-list';

export const metadata = { title: 'Personal · COEX' };

/** A person's own captured work. This is deliberately private from every other account. */
export default async function PersonalPage() {
  const actor = await requirePermission('task.read.own');
  const { spaceId, tasks, users, runningTimer } = await asUser(actor, async () => {
    const spaceId = await personalSpaceForCurrentUser();
    return {
      spaceId,
      tasks: await listTasks({ spaceId, includeClosed: true }),
      users: await listUsers(),
      runningTimer: await getRunningTimer(),
    };
  });
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Personal"
        description="Only you can see these tasks."
        action={<PersonalTaskPanel />}
      />
      <TaskList
        tasks={tasks}
        users={users.map(({ id, name }) => ({ id, name }))}
        columnsBySpace={{
          [spaceId]: [
            { name: 'To do', isClosed: false },
            { name: 'In progress', isClosed: false },
            { name: 'Blocked', isClosed: false },
            { name: 'Done', isClosed: true },
          ],
        }}
        canManage
        runningTaskId={runningTimer?.kind === 'task' ? runningTimer.itemId : null}
      />
    </div>
  );
}
