import { asUser, requirePermission } from '@/lib/session';
import { listTasks } from '@/modules/tasks/services/task.service';
import { listSpaces } from '@/modules/tasks/services/space.service';
import { getRunningTimer } from '@/modules/time/services/time.service';
import { listUsers } from '@/modules/core/services/user.service';
import { PageHeader } from '@/components/ui';
import { TaskFilters } from './filters';
import { TaskList } from './task-list';
import { listFolders } from '@/modules/tasks/services/folder.service';
import { NewTaskPopup } from './new-task-popup';

export const metadata = { title: 'Tasks · COEX' };

/**
 * Every open task the signed in person is allowed to see, grouped by when it is due.
 *
 * Filters stay in the address bar so a view can be bookmarked. An agent sees their own work; a
 * manager sees the tenant, and the service enforces that rather than the page hiding a link.
 */
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    mine?: string;
    overdue?: string;
    unassigned?: string;
    closed?: string;
    space?: string | string[];
    assignee?: string | string[];
  }>;
}) {
  const actor = await requirePermission('task.read.own');
  const params = await searchParams;

  const seesEverything = actor.permissions.includes('task.read.all');
  const ids = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value : value ? [value] : []).filter((id) =>
      /^[0-9a-f]{24}$/i.test(id),
    );
  const spaceIds = ids(params.space);
  // Choosing other people is for those who can see every task; everyone else stays on their own.
  const assigneeIds = seesEverything ? ids(params.assignee) : [];
  const mine = assigneeIds.length === 0 && (params.mine === '1' || !seesEverything);

  const { tasks, spaces, users, folders, runningTimer } = await asUser(actor, async () => ({
    tasks: await listTasks({
      assigneeId: mine ? actor.id : undefined,
      assigneeIds,
      spaceIds,
      overdueOnly: params.overdue === '1',
      unassignedOnly: params.unassigned === '1',
      includeClosed: params.closed === '1',
    }),
    // Status can be changed from this list, and each space configures its own columns, so the
    // picker needs to know which columns belong to the space the task is in.
    spaces: await listSpaces(),
    users: await listUsers(),
    folders: await listFolders(),
    runningTimer: await getRunningTimer(),
  }));

  const columnsBySpace = Object.fromEntries(spaces.map((space) => [space.id, space.statuses]));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Tasks"
        description={
          mine
            ? params.closed !== '1' && !params.overdue && !params.unassigned
              ? `${tasks.length} open task${tasks.length === 1 ? '' : 's'} assigned to you. The Tasks badge counts this list.`
              : 'The work assigned to you, with your selected filters.'
            : 'Everything open across every space, unless you narrow it below. Overdue first.'
        }
        action={
          actor.permissions.includes('task.manage') ? (
            <NewTaskPopup
              spaces={spaces.map((space) => ({ id: space.id, name: space.name }))}
              folders={folders.map((folder) => ({
                id: folder.id,
                spaceId: folder.spaceId,
                name: folder.name,
              }))}
              users={users.map((user) => ({ id: user.id, name: user.name }))}
            />
          ) : undefined
        }
      />

      <TaskFilters
        mine={mine}
        overdue={params.overdue === '1'}
        unassigned={params.unassigned === '1'}
        closed={params.closed === '1'}
        canSeeAll={seesEverything}
        spaces={spaces.map((space) => ({ id: space.id, name: space.name }))}
        users={users
          .filter((user) => user.status === 'active')
          .map((user) => ({ id: user.id, name: user.name }))}
        selectedSpaceIds={spaceIds}
        selectedAssigneeIds={assigneeIds}
      />

      <div className="mt-4">
        <TaskList
          tasks={tasks}
          users={users.map((user) => ({ id: user.id, name: user.name }))}
          columnsBySpace={columnsBySpace}
          canManage={actor.permissions.includes('task.manage')}
          runningTaskId={runningTimer?.kind === 'task' ? runningTimer.itemId : null}
        />
      </div>
    </div>
  );
}
