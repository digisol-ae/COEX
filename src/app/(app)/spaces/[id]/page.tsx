import { notFound } from 'next/navigation';
import { asUser, requirePermission } from '@/lib/session';
import { getSpace, progressPercent } from '@/modules/tasks/services/space.service';
import { listFolders } from '@/modules/tasks/services/folder.service';
import { listTasks } from '@/modules/tasks/services/task.service';
import { getRunningTimer } from '@/modules/time/services/time.service';
import { Progress } from '@/components/ui/progress';
import { Monogram } from '@/components/ui/monogram';
import { Avatar } from '@/components/ui/avatar';
import { listUsers } from '@/modules/core/services/user.service';
import { listOrganisations } from '@/modules/crm/services/organisation.service';
import { PageHeader } from '@/components/ui';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Board } from './board';
import { SpaceSettings } from './space-settings';

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

  const { tasks, users, folders, customers, runningTimer } = await asUser(actor, async () => ({
    tasks: await listTasks({ spaceId: id, includeClosed: true }),
    users: await listUsers(),
    folders: await listFolders(id),
    customers: await listOrganisations(),
    runningTimer: await getRunningTimer(),
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
          titleExtra={<span className="flex -space-x-1.5">{space.memberIds.map((memberId) => <Avatar key={String(memberId)} name={users.find((user) => user.id === String(memberId))?.name ?? 'Unknown'} size="small" />)}{actor.permissions.includes('task.manage') ? <SpaceSettings space={{ id, name: space.name, description: space.description ?? null, memberIds: space.memberIds.map(String), organisationId: space.organisationId ? String(space.organisationId) : null }} users={users.map((user) => ({ id: user.id, name: user.name }))} customers={customers.map((customer) => ({ id: customer.id, name: customer.name }))} /> : null}</span>}
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
          description: row.description,
          isPrivate: row.isPrivate,
          memberIds: row.memberIds,
          memberNames: row.memberNames,
        }))}
        activeFolderId={folder ?? null}
        tasks={tasks}
        users={users.map((user) => ({ id: user.id, name: user.name }))}
        canManage={actor.permissions.includes('task.manage')}
        initialView={view === 'list' ? 'list' : view === 'gantt' ? 'gantt' : 'board'}
        runningTaskId={runningTimer?.taskId ?? null}
      />
    </div>
  );
}
