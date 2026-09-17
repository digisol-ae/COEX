import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asUser, requirePermission } from '@/lib/session';
import { getTask } from '@/modules/tasks/services/task.service';
import { getProject } from '@/modules/tasks/services/project.service';
import { listUsers } from '@/modules/core/services/user.service';
import { Badge, Card, CardSection, PageHeader } from '@/components/ui';
import { getRunningTimer, loggedMinutesForTask } from '@/modules/time/services/time.service';
import { formatMinutes } from '@/modules/time/week';
import { toDateTimeInput } from '@/modules/tasks/dates';
import { TimerButton } from '@/modules/time/components/timer-button';
import { TaskForm } from './task-form';
import { SubtaskList } from './subtask-list';
import { DocumentLinks } from './document-links';

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('task.read.own');
  const { id } = await params;

  const task = await asUser(actor, () => getTask(id));
  if (!task) notFound();

  const { project, users, timer, loggedMinutes } = await asUser(actor, async () => ({
    project: await getProject(String(task.projectId)),
    users: await listUsers(),
    timer: await getRunningTimer(),
    loggedMinutes: await loggedMinutesForTask(id),
  }));

  const canManage = actor.permissions.includes('task.manage');

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/projects/${String(task.projectId)}`}
        className="text-sm text-[var(--color-ink-muted)] underline-offset-4 hover:underline"
      >
        Back to {project?.name ?? 'project'}
      </Link>

      <div className="mt-3">
        <PageHeader
          title={task.title}
          description={`${task.number} · ${project?.name ?? ''}${task.phase ? ` · ${task.phase}` : ''}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <TimerButton taskId={id} running={timer?.taskId === id} />
              <Badge tone={task.isClosed ? 'ok' : 'info'}>{task.status}</Badge>
              {task.priority !== 'normal' ? (
                <Badge tone={task.priority === 'urgent' ? 'alert' : 'warn'}>{task.priority}</Badge>
              ) : null}
            </div>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <CardSection title="Time">
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <div>
                  <p className="text-xs tracking-wide text-[var(--color-ink-subtle)] uppercase">
                    Logged
                  </p>
                  <p className="text-lg font-medium text-[var(--color-ink)] tabular-nums">
                    {formatMinutes(loggedMinutes)}
                  </p>
                </div>

                <div>
                  <p className="text-xs tracking-wide text-[var(--color-ink-subtle)] uppercase">
                    Estimate
                  </p>
                  <p className="text-lg font-medium text-[var(--color-ink-muted)] tabular-nums">
                    {task.estimateMinutes ? formatMinutes(task.estimateMinutes) : 'none'}
                  </p>
                </div>

                <div>
                  <p className="text-xs tracking-wide text-[var(--color-ink-subtle)] uppercase">
                    Planned
                  </p>
                  <p
                    className="text-lg font-medium text-[var(--color-ink-muted)] tabular-nums"
                    title="Working hours between the start and the end, using the tenant working calendar"
                  >
                    {task.plannedMinutes ? formatMinutes(task.plannedMinutes) : 'not scheduled'}
                  </p>
                </div>

                {task.estimateMinutes && loggedMinutes > task.estimateMinutes ? (
                  <Badge tone="warn">over estimate</Badge>
                ) : null}
              </div>
            </CardSection>
          </Card>

          <SubtaskList
            taskId={id}
            canManage={canManage}
            subtasks={task.subtasks.map((subtask) => ({
              id: String(subtask._id),
              title: subtask.title,
              done: subtask.done ?? false,
            }))}
          />

          <DocumentLinks
            taskId={id}
            canManage={canManage}
            links={task.documentLinks.map((link) => ({
              id: String(link._id),
              url: link.url,
              title: link.title,
            }))}
          />
        </div>

        <Card>
          <CardSection title="Details">
            <TaskForm
              canManage={canManage}
              users={users.map((user) => ({ id: user.id, name: user.name }))}
              task={{
                id,
                title: task.title,
                description: task.description ?? '',
                priority: task.priority,
                assigneeIds: task.assigneeIds.map((value) => String(value)),
                startAt: toDateTimeInput(task.startAt),
                endAt: toDateTimeInput(task.endAt),
                estimateHours: task.estimateMinutes ? String(task.estimateMinutes / 60) : '',
                tags: (task.tags ?? []).join(', '),
                phase: task.phase ?? '',
              }}
              phases={project?.phases ?? []}
            />
          </CardSection>
        </Card>
      </div>
    </div>
  );
}
