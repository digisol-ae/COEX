import { TeamsShare } from '@/components/tasks/teams-share';
import { TaskAddTime } from '@/modules/time/components/ticket-add-time';
import { FactBadge } from '@/components/ui/fact-badge';
import { DetailPopup } from '@/components/ui/detail-popup';
import { Avatar } from '@/components/ui/avatar';
import { DeskTaskButton } from '@/components/tasks/desk-task-button';
import { TaskOriginSummary } from '@/components/tasks/task-origin-summary';
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
import { Badge, PageHeader } from '@/components/ui';
import {
  getRunningTimer,
  listTaskTimeByPerson,
  loggedMinutesForTask,
} from '@/modules/time/services/time.service';
import { TaskTimeSummary } from '@/modules/time/components/task-time-summary';
import { TimeEntriesByPerson } from '@/modules/time/components/time-entries-by-person';
import { formatMinutes, toDateKey } from '@coex/shared/time/week';
import { toDateTimeInput } from '@coex/shared/tasks/dates';
import { TimerButton } from '@/modules/time/components/timer-button';
import { TaskForm } from './task-form';
import { SubtaskList } from './subtask-list';
import { TaskFilesDrawer } from './task-files-drawer';
import { TaskComments } from './task-comments';
import { TaskStatus } from './task-status';
import { MySubtaskDone } from './my-subtask-done';

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
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/spaces/${String(task.spaceId)}`}
        className="text-sm text-[var(--color-ink-muted)] underline-offset-4 hover:underline"
      >
        Back to {space?.name ?? 'space'}
      </Link>

      <div className="mt-2 [&>div]:mb-2">
        <PageHeader
          title={task.title}
          action={
            <div className="ml-auto shrink-0">
              <TaskFilesDrawer
                taskId={id}
                canManage={canManage}
                links={task.documentLinks.map((link) => ({
                  id: String(link._id),
                  url: link.url,
                  title: link.title,
                }))}
                attachments={comments.flatMap((comment) =>
                  comment.attachments.map((file) => ({ ...file, authorName: comment.authorName })),
                )}
              />
            </div>
          }
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
        />
      </div>

      <TeamsShare
        task={{ id, number: task.number, title: task.title, status: task.status }}
        source={task.sourceTeamsMessageUrl}
        description={task.description}
      />

      <div className="mb-2">
        <TaskOriginSummary
          origin={origin}
          viewerId={actor.id}
          people={users.map(({ id, name }) => ({ id, name }))}
        />
      </div>

      <div className="space-y-3">
        <div className="space-y-3">
          <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-transparent px-3 py-2">
            <div className="coex-filters flex flex-wrap items-center gap-2">
              <DeskTaskButton taskId={id} assigneeIds={assignedIds} />
              {assignedIds.includes(actor.id) ? (
                <MySubtaskDone
                  taskId={id}
                  done={(task.mySubtaskDoneByIds ?? []).some((value) => String(value) === actor.id)}
                />
              ) : null}
              <TimerButton
                compact
                taskId={id}
                running={timer?.kind === 'task' && timer?.itemId === id}
              />
              <TaskAddTime compact taskId={id} />

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
            <div className="my-2 border-t border-[var(--color-line)]" />
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-muted)]">
              <span className="font-medium">Assigned to:</span>
              {assignedIds.length ? (
                ownerChoices
                  .filter((user) => assignedIds.includes(user.id))
                  .map((user) => (
                    <span
                      key={user.id}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] px-2 py-0.5"
                    >
                      <Avatar name={user.name} size="small" />
                      {user.name}
                      {(task.mySubtaskDoneByIds ?? []).some(
                        (value) => String(value) === user.id,
                      ) ? (
                        <span className="text-[10px] text-[var(--color-status-ok)]">
                          ✓ My subtask done
                        </span>
                      ) : null}
                    </span>
                  ))
              ) : (
                <span>Unassigned</span>
              )}
              <FactBadge icon="alert" label="Priority">
                {task.priority}
              </FactBadge>
              <span>
                Starts: {task.startAt ? toDateTimeInput(task.startAt).replace('T', ' ') : 'No date'}
              </span>
              <span>
                Due: {task.endAt ? toDateTimeInput(task.endAt).replace('T', ' ') : 'No date'}
              </span>
              {task.folderId ? (
                <span>{folders.find((folder) => folder.id === String(task.folderId))?.name}</span>
              ) : null}
              {task.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full border border-[var(--color-line)] px-2 py-0.5 text-xs"
                  aria-label={`Tag: ${tag}`}
                >
                  #{tag}
                </span>
              ))}
              {canManage ? (
                <DetailPopup title="Edit task" icon="edit">
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
                </DetailPopup>
              ) : null}
            </div>
            {task.description ? (
              <p className="mt-2 border-t border-[var(--color-line)] pt-2 text-sm whitespace-pre-wrap text-[var(--color-ink)] [overflow-wrap:anywhere]">
                {task.description}
              </p>
            ) : null}
          </section>

          <TaskTimeSummary
            yourTime={formatMinutes(loggedMinutes)}
            agents={
              actor.permissions.includes('timesheet.read.all')
                ? [
                    ...new Map([
                      ...users
                        .filter((user) => assignedIds.includes(user.id))
                        .map(
                          (user) =>
                            [
                              user.id,
                              {
                                id: user.id,
                                name: user.name,
                                time: formatMinutes(
                                  timeByPerson.find((person) => person.userId === user.id)
                                    ?.minutes ?? 0,
                                ),
                              },
                            ] as const,
                        ),
                      ...timeByPerson.map(
                        (person) =>
                          [
                            person.userId,
                            {
                              id: person.userId,
                              name: person.name,
                              time: formatMinutes(person.minutes),
                            },
                          ] as const,
                      ),
                    ]).values(),
                  ]
                : []
            }
            estimate={task.estimateMinutes ? formatMinutes(task.estimateMinutes) : null}
            overEstimate={Boolean(task.estimateMinutes && loggedMinutes > task.estimateMinutes)}
            allPeople={
              actor.permissions.includes('timesheet.read.all')
                ? formatMinutes(timeByPerson.reduce((sum, p) => sum + p.minutes, 0))
                : null
            }
            hasEntries={timeByPerson.length > 0}
          >
            <TimeEntriesByPerson
              alwaysExpanded
              people={timeByPerson.map((person) => ({
                userId: person.userId,
                name: person.name,
                minutes: person.minutes,
                entries: person.entries.map((entry) => ({
                  id: entry.id,
                  day: toDateKey(entry.workDate),
                  minutes: entry.minutes,
                  note: entry.note,
                  running: entry.running,
                })),
              }))}
            />
          </TaskTimeSummary>

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
        </div>
      </div>
    </div>
  );
}
