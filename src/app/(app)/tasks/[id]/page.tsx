import { DeskTaskButton } from '@/components/tasks/desk-task-button';
import { TaskOriginLines } from '@/components/tasks/task-origin';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asUser, requirePermission } from '@/lib/session';
import {
  assignableUserIdsForSubtask,
  assignableUserIdsForTask,
  getTask,
  listTaskComments,
  mentionableForTask,
  sourceTicketFor,
  taskOrigin,
} from '@/modules/tasks/services/task.service';
import { getSpace } from '@/modules/tasks/services/space.service';
import { listFolders } from '@/modules/tasks/services/folder.service';
import { listUsers } from '@/modules/core/services/user.service';
import { Badge, Card, CardSection, PageHeader } from '@/components/ui';
import {
  getRunningTimer,
  listTaskTimeByPerson,
  loggedMinutesForTask,
} from '@/modules/time/services/time.service';
import { formatMinutes, toDateKey } from '@/modules/time/week';
import { toDateTimeInput } from '@/modules/tasks/dates';
import { TimerButton } from '@/modules/time/components/timer-button';
import { TaskForm } from './task-form';
import { SubtaskList } from './subtask-list';
import { DocumentLinks } from './document-links';
import { TaskComments } from './task-comments';
import { TaskStatus } from './task-status';

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('task.read.own');
  const { id } = await params;

  const task = await asUser(actor, () => getTask(id));
  if (!task) notFound();

  const {
    space,
    folders,
    users,
    timer,
    loggedMinutes,
    timeByPerson,
    comments,
    ownerIds,
    subtaskOwnerIds,
    mentionable,
    sourceTicket,
    origin,
  } = await asUser(actor, async () => ({
    space: await getSpace(String(task.spaceId)),
    folders: await listFolders(String(task.spaceId)),
    users: await listUsers(),
    timer: await getRunningTimer(),
    loggedMinutes: await loggedMinutesForTask(id),
    // Other people's hours are for those granted timesheet.read.all; everyone else sees their own.
    timeByPerson: await listTaskTimeByPerson(
      id,
      actor.permissions.includes('timesheet.read.all') ? {} : { onlyUserId: actor.id },
    ),
    comments: await listTaskComments(id),
    ownerIds: await assignableUserIdsForTask(task),
    subtaskOwnerIds: await assignableUserIdsForSubtask(task),
    mentionable: await mentionableForTask(id),
    sourceTicket: await sourceTicketFor(task),
    origin: await taskOrigin(task),
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
          description={
            <>
              {task.number} · {space?.name ?? ''}
              {sourceTicket ? (
                <>
                  {' · From ticket '}
                  <Link
                    href={`/support/tickets/${sourceTicket.id}`}
                    className="font-medium text-[var(--color-ink)] underline underline-offset-4"
                  >
                    {sourceTicket.number}
                  </Link>
                  {sourceTicket.subject ? ` ${sourceTicket.subject}` : ''}
                </>
              ) : null}
            </>
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              <DeskTaskButton taskId={id} assigneeIds={assignedIds} />
              <TimerButton taskId={id} running={timer?.kind === 'task' && timer?.itemId === id} />
              {canManage && space ? (
                <TaskStatus
                  taskId={id}
                  spaceId={String(task.spaceId)}
                  status={task.status}
                  statuses={[...space.statuses]
                    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                    .map((stage) => ({ name: stage.name, isClosed: stage.isClosed ?? false }))}
                />
              ) : (
                <Badge tone={task.isClosed ? 'ok' : 'info'}>{task.status}</Badge>
              )}
              {task.priority !== 'normal' ? (
                <Badge tone={task.priority === 'urgent' ? 'alert' : 'warn'}>{task.priority}</Badge>
              ) : null}
            </div>
          }
        />
      </div>

      <TaskOriginLines
        origin={origin}
        viewerId={actor.id}
        people={users.map(({ id, name }) => ({ id, name }))}
        className="-mt-4 mb-6 space-y-0.5 text-sm text-[var(--color-ink-muted)]"
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <CardSection title="Time">
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <div>
                  <p className="text-xs tracking-wide text-[var(--color-ink-subtle)] uppercase">
                    Your time
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

              <h3 className="mt-5 flex items-baseline justify-between text-xs font-medium tracking-wide text-[var(--color-ink-subtle)] uppercase">
                <span>Time entries</span>
                {actor.permissions.includes('timesheet.read.all') && timeByPerson.length > 0 ? (
                  <span title="Everyone's time on this task added together">
                    All people {formatMinutes(timeByPerson.reduce((sum, p) => sum + p.minutes, 0))}
                  </span>
                ) : null}
              </h3>
              {timeByPerson.length === 0 ? (
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                  No time has been logged on this task yet.
                </p>
              ) : (
                <ul className="mt-2 space-y-3">
                  {timeByPerson.map((person) => (
                    <li key={person.userId}>
                      <p className="flex items-center justify-between text-sm font-medium text-[var(--color-ink)]">
                        <span>{person.name}</span>
                        <span className="tabular-nums">{formatMinutes(person.minutes)}</span>
                      </p>
                      <ul className="mt-1 divide-y divide-[var(--color-line)] text-xs text-[var(--color-ink-muted)]">
                        {person.entries.map((entry) => (
                          <li key={entry.id} className="flex items-baseline gap-3 py-1">
                            <span className="w-24 shrink-0">{toDateKey(entry.workDate)}</span>
                            <span className="w-14 shrink-0 tabular-nums">
                              {formatMinutes(entry.minutes)}
                            </span>
                            <span className="min-w-0 flex-1 truncate">
                              {entry.running ? 'Running now' : (entry.note ?? '')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </CardSection>
          </Card>

          <TaskComments
            taskId={id}
            canComment={canManage}
            comments={comments}
            people={mentionable}
            ticket={sourceTicket ? { id: sourceTicket.id, number: sourceTicket.number } : null}
          />

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
