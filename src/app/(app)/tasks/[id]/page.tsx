import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asUser, requirePermission } from '@/lib/session';
import {
  assignableUserIdsForSubtask,
  assignableUserIdsForTask,
  getTask,
  listTaskComments,
} from '@/modules/tasks/services/task.service';
import { getSpace } from '@/modules/tasks/services/space.service';
import { listFolders } from '@/modules/tasks/services/folder.service';
import { listUsers } from '@/modules/core/services/user.service';
import { Badge, Card, CardSection, PageHeader } from '@/components/ui';
import { getRunningTimer, loggedMinutesForTask } from '@/modules/time/services/time.service';
import { formatMinutes } from '@/modules/time/week';
import { toDateTimeInput } from '@/modules/tasks/dates';
import { TimerButton } from '@/modules/time/components/timer-button';
import { TaskForm } from './task-form';
import { SubtaskList } from './subtask-list';
import { DocumentLinks } from './document-links';
import { TaskComments } from './task-comments';

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('task.read.own');
  const { id } = await params;

  const task = await asUser(actor, () => getTask(id));
  if (!task) notFound();

  const { space, folders, users, timer, loggedMinutes, comments, ownerIds, subtaskOwnerIds } =
    await asUser(actor, async () => ({
      space: await getSpace(String(task.spaceId)),
      folders: await listFolders(String(task.spaceId)),
      users: await listUsers(),
      timer: await getRunningTimer(),
      loggedMinutes: await loggedMinutesForTask(id),
      comments: await listTaskComments(id),
      ownerIds: await assignableUserIdsForTask(task),
      subtaskOwnerIds: await assignableUserIdsForSubtask(task),
    }));

  const canManage = actor.permissions.includes('task.manage');

  // Pickers offer only people the service will accept; anyone already assigned stays listed.
  const assignedIds = task.assigneeIds.map(String);
  const subtaskAssignedIds = task.subtasks.flatMap((subtask) =>
    subtask.assigneeId ? [String(subtask.assigneeId)] : [],
  );
  const ownerChoices = users
    .filter((user) => !ownerIds || ownerIds.includes(user.id) || assignedIds.includes(user.id))
    .map((user) => ({ id: user.id, name: user.name }));
  const subtaskChoices = users
    .filter(
      (user) =>
        !subtaskOwnerIds ||
        subtaskOwnerIds.includes(user.id) ||
        subtaskAssignedIds.includes(user.id),
    )
    .map((user) => ({ id: user.id, name: user.name }));

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href={`/spaces/${String(task.spaceId)}`}
        className="text-sm text-[var(--color-ink-muted)] underline-offset-4 hover:underline"
      >
        Back to {space?.name ?? 'space'}
      </Link>

      <div className="mt-3">
        <PageHeader
          title={task.title}
          description={`${task.number} · ${space?.name ?? ''}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <TimerButton taskId={id} running={timer?.kind === 'task' && timer?.itemId === id} />
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

          <TaskComments taskId={id} canComment={canManage} comments={comments} />

          <SubtaskList
            taskId={id}
            canManage={canManage}
            users={subtaskChoices}
            subtasks={task.subtasks.map((subtask) => ({
              id: String(subtask._id),
              title: subtask.title,
              done: subtask.done ?? false,
              assigneeId: subtask.assigneeId ? String(subtask.assigneeId) : null,
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
              users={ownerChoices}
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
                folderId: task.folderId ? String(task.folderId) : '',
              }}
              folders={folders.map((folder) => ({
                id: folder.id,
                name: folder.name,
                isPrivate: folder.isPrivate,
              }))}
            />
          </CardSection>
        </Card>
      </div>
    </div>
  );
}
