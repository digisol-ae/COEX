import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asUser, requirePermission } from '@/lib/session';
import { getProject } from '@/modules/tasks/services/portfolio.service';
import { listTasks } from '@/modules/tasks/services/task.service';
import { listUsers } from '@/modules/core/services/user.service';
import { PageHeader } from '@/components/ui';
import { Board } from './board';

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const actor = await requirePermission('task.read.all');
  const { id } = await params;
  const { view } = await searchParams;

  const project = await asUser(actor, () => getProject(id));
  if (!project) notFound();

  const { tasks, users } = await asUser(actor, async () => ({
    tasks: await listTasks({ projectId: id, includeClosed: true }),
    users: await listUsers(),
  }));

  const columns = [...project.statuses]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((status) => ({ name: status.name, isClosed: status.isClosed ?? false }));

  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href="/projects"
        className="text-sm text-[var(--color-ink-muted)] underline-offset-4 hover:underline"
      >
        Back to projects
      </Link>

      <div className="mt-3">
        <PageHeader title={project.name} description={project.description ?? undefined} />
      </div>

      <Board
        projectId={id}
        columns={columns}
        tasks={tasks}
        users={users.map((user) => ({ id: user.id, name: user.name }))}
        canManage={actor.permissions.includes('task.manage')}
        initialView={view === 'list' ? 'list' : 'board'}
      />
    </div>
  );
}
