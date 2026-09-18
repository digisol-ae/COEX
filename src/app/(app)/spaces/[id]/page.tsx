import { notFound } from 'next/navigation';
import { asUser, requirePermission } from '@/lib/session';
import { getSpace, progressPercent } from '@/modules/tasks/services/space.service';
import { listFolders } from '@/modules/tasks/services/folder.service';
import { listTasks } from '@/modules/tasks/services/task.service';
import { Progress } from '@/components/ui/progress';
import { Monogram } from '@/components/ui/monogram';
import { listUsers } from '@/modules/core/services/user.service';
import { PageHeader } from '@/components/ui';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Board } from './board';

export default async function SpacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; folder?: string }>;
}) {
  const actor = await requirePermission('task.read.all');
  const { id } = await params;
  const { view, folder } = await searchParams;

  const space = await asUser(actor, () => getSpace(id));
  if (!space) notFound();

  const { tasks, users, folders } = await asUser(actor, async () => ({
    tasks: await listTasks({ spaceId: id, includeClosed: true }),
    users: await listUsers(),
    folders: await listFolders(id),
  }));

  const columns = [...space.statuses]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((status) => ({ name: status.name, isClosed: status.isClosed ?? false }));

  return (
    <div className="mx-auto max-w-7xl">
      <Breadcrumb
        trail={[
          { label: 'Tasks and planning', href: '/tasks' },
          { label: 'Spaces', href: '/spaces' },
          { label: space.name },
        ]}
      />

      <div className="mt-2">
        <PageHeader
          icon={<Monogram name={space.name} />}
          title={space.name}
          description={space.description ?? undefined}
          action={
            <div className="w-48">
              <Progress
                percent={progressPercent(
                  tasks.map((task) => ({
                    isClosed: task.isClosed,
                    estimateMinutes: task.estimateMinutes,
                  })),
                )}
                label={`${space.name} progress`}
              />
              <p className="mt-1 text-right text-xs text-[var(--color-ink-subtle)]">
                {tasks.filter((task) => task.isClosed).length} of {tasks.length} tasks done
              </p>
            </div>
          }
        />
      </div>

      <Board
        spaceId={id}
        columns={columns}
        folders={folders.map((row) => ({
          id: row.id,
          name: row.name,
          isPrivate: row.isPrivate,
          memberIds: row.memberIds,
          memberNames: row.memberNames,
        }))}
        activeFolderId={folder ?? null}
        tasks={tasks}
        users={users.map((user) => ({ id: user.id, name: user.name }))}
        canManage={actor.permissions.includes('task.manage')}
        initialView={view === 'list' ? 'list' : view === 'gantt' ? 'gantt' : 'board'}
      />
    </div>
  );
}
