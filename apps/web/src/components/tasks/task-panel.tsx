'use client';
import { TeamsShare } from './teams-share';
import { TaskFilesDrawer } from '@/app/(app)/tasks/[id]/task-files-drawer';
import { TicketAttachmentPicker } from '@/components/ui/ticket-attachment-picker';
import { AttachmentItem } from '@/app/(app)/support/tickets/[id]/attachment-item';
import { UI_LABELS } from '@/components/ui/labels';

import { BubbleText } from '@/app/(app)/support/tickets/[id]/bubble-text';

import { DeskTaskButton } from '@/components/tasks/desk-task-button';

import Link from 'next/link';
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { clsx } from 'clsx';
import { Button, Notice } from '@/components/ui';
import { IconLink } from '@/components/ui/icon-button';
import { StatusDot } from '@/components/ui/pill';
import { formatMinutes } from '@coex/shared/time/week';
import { formatDateTime } from '@coex/shared/tasks/dates';
import { MentionTextarea, type MentionPerson } from '@/components/ui/mention-textarea';
import type { TaskOrigin, TaskSummary } from '@/modules/tasks/services/task.service';
import { TaskOriginSummary } from './task-origin-summary';
import { addTaskCommentAction, type TaskFormState } from '@/app/(app)/tasks/actions';
import {
  AssigneePicker,
  CalendarIcon,
  PriorityPicker,
  SchedulePicker,
  StatusPicker,
  type PriorityValue,
} from './inline-edit';

export interface TaskColumn {
  name: string;
  isClosed: boolean;
}

/**
 * A task, opened over the board rather than instead of it.
 *
 * Losing the board to read one task is what makes people stop opening tasks, and a plan nobody
 * opens stops describing the work within a week. The panel keeps the board behind it, so closing
 * it returns you to exactly the column and scroll position you left.
 *
 * It opens with what the card already knows and fills in the description, the links and the logged
 * time when they arrive. Waiting for a round trip before showing anything would reintroduce the
 * delay the panel exists to remove.
 */

interface PanelDetail {
  description: string | null;
  tags: string[];
  documentLinks: { id: string; url: string; title: string }[];
  loggedMinutes: number;
  timerRunning: boolean;
  /** null means the Space and Folder are both open, so anyone in the tenant may own the task. */
  assignableUserIds: string[] | null;
  subtaskAssignableUserIds: string[] | null;
  /** The ticket this task was raised from, linked from the panel header. */
  sourceTicket: { id: string; number: string } | null;
  origin: TaskOrigin;
  viewerId: string;
  /** The task's work updates, oldest first, for the compact Updates section. */
  comments: {
    attachments?: { id: string; fileName: string; contentType: string; bytes: number }[];
    isSystem?: boolean;
    id: string;
    body: string;
    authorName: string;
    createdAt: string;
    editedAt: string | null;
  }[];
  mentionable: MentionPerson[];
}

export interface PanelHandlers {
  users: { id: string; name: string }[];
  /** Who may own this task, when the view already knows its Space and Folder members. */
  assignableUsersFor?: (task: TaskSummary) => { id: string; name: string }[];
  /** Per task, because My tasks spans spaces and each space configures its own columns. */
  columnsFor: (task: TaskSummary) => TaskColumn[];
  canManage: boolean;
  /** The task whose timer is currently running for this person, so a card can show it and offer
   * to stop it rather than start a second one. */
  runningTaskId: string | null;
  onPriority: (task: TaskSummary, priority: PriorityValue) => void;
  onSchedule: (task: TaskSummary, value: { startAt: string | null; endAt: string | null }) => void;
  onAssignees: (task: TaskSummary, ids: string[]) => void;
  onStatus: (task: TaskSummary, status: string) => void;
  onSubtask: (task: TaskSummary, subtaskId: string, done: boolean) => void;
  onSubtaskAssignee: (task: TaskSummary, subtaskId: string, assigneeId: string | null) => void;
  onAddSubtask: (task: TaskSummary, title: string) => Promise<string | null>;
  onRename: (task: TaskSummary, title: string) => void;
  onDescribe: (task: TaskSummary, description: string) => void;
  onTags: (task: TaskSummary, tags: string[]) => void;
  /** Opening a task over whatever list it was clicked in, rather than instead of it. */
  onOpen: (task: TaskSummary) => void;
}

export function TaskPanel({
  task,
  handlers,
  onClose,
}: {
  task: TaskSummary;
  handlers: PanelHandlers;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<PanelDetail | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [visibleUpdates, setVisibleUpdates] = useState(3);
  const [commentState, commentFormAction, commentPending] = useActionState<TaskFormState, FormData>(
    addTaskCommentAction,
    {},
  );
  const commentForm = useRef<HTMLFormElement>(null);

  const { canManage, users } = handlers;
  const columns = handlers.columnsFor(task);

  // Owners come from the Space and Folder members; subtask owners from the task's own owners.
  // Whoever is already selected stays listed, so an older assignment is shown rather than hidden.
  const ownerAllowed = detail?.assignableUserIds ?? null;
  const ownerOptions =
    handlers.assignableUsersFor?.(task) ??
    (ownerAllowed
      ? users.filter((user) => ownerAllowed.includes(user.id) || task.assigneeIds.includes(user.id))
      : users);
  const subtaskAllowed =
    task.assigneeIds.length > 0 ? task.assigneeIds : (detail?.subtaskAssignableUserIds ?? null);
  const subtaskOptionsFor = (current: string | null) =>
    subtaskAllowed
      ? users.filter((user) => subtaskAllowed.includes(user.id) || user.id === current)
      : users;

  const loadDetail = useCallback(() => {
    let live = true;

    fetch(`/api/tasks/${task.id}/panel`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: PanelDetail | null) => {
        if (live && payload) setDetail(payload);
      })
      .catch(() => {
        if (live) setError('Could not load the rest of this task.');
      });

    return () => {
      live = false;
    };
  }, [task.id]);

  // The panel is mounted per task by its key, so this runs once for each task opened and detail
  // starts empty on its own rather than being cleared here.
  useEffect(() => {
    return loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!commentState.saved) return;
    commentForm.current?.reset();
    return loadDetail();
  }, [commentState, loadDetail]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close the task"
        onClick={onClose}
        className="popup-backdrop flex-1"
      />

      <aside
        aria-label={`${task.number} ${task.title}`}
        className="flex w-full max-w-lg flex-col overflow-y-auto border-l border-[var(--color-line)] bg-[var(--color-surface)] shadow-[var(--shadow-pop)]"
      >
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-surface)]/95 px-4 py-3 backdrop-blur">
          <StatusPicker
            status={task.status}
            columns={columns}
            disabled={!canManage}
            onChange={(status) => handlers.onStatus(task, status)}
            trigger={<StatusDot status={task.status} isClosed={task.isClosed} />}
          />

          <span className="font-mono text-[11px] text-[var(--color-ink-subtle)]">
            {task.number}
          </span>

          {detail?.sourceTicket ? (
            <Link
              href={`/support/tickets/${detail.sourceTicket.id}`}
              className="text-[12px] font-medium text-[var(--color-ink-muted)] underline underline-offset-4"
            >
              Ticket {detail.sourceTicket.number}
            </Link>
          ) : null}

          <DeskTaskButton taskId={task.id} assigneeIds={task.assigneeIds} />

          <IconLink
            icon="open"
            label="Open the task in its own page"
            href={`/tasks/${task.id}`}
            className="ml-auto"
          />

          <button
            type="button"
            onClick={onClose}
            aria-label={UI_LABELS.close}
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-ink-subtle)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="m3 3 6 6M9 3l-6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        <div className="space-y-4 px-4 py-4">
          {detail ? (
            <div className="flex justify-end">
              <TaskFilesDrawer
                taskId={task.id}
                canManage={canManage}
                links={detail.documentLinks}
                attachments={detail.comments.flatMap((comment) =>
                  (comment.attachments ?? []).map((file) => ({
                    ...file,
                    authorName: comment.authorName,
                  })),
                )}
              />
            </div>
          ) : null}
          {error ? <Notice tone="alert">{error}</Notice> : null}

          <textarea
            key={`title-${task.id}`}
            defaultValue={task.title}
            readOnly={!canManage}
            rows={2}
            onBlur={(event) => {
              const next = event.target.value.trim();
              if (next && next !== task.title) handlers.onRename(task, next);
            }}
            className="w-full resize-none rounded-[var(--radius-control)] border border-transparent bg-transparent px-2 py-1 text-lg font-medium text-[var(--color-ink)] hover:border-[var(--color-line)] focus:border-[var(--color-line-strong)] focus:outline-none"
          />

          {detail ? (
            <TaskOriginSummary
              origin={detail.origin}
              viewerId={detail.viewerId}
              people={task.assigneeIds.map((id, index) => ({
                id,
                name: task.assigneeNames[index] ?? '',
              }))}
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 text-[13px]">
            <Meta label={UI_LABELS.assignedTo}>
              <AssigneePicker
                users={ownerOptions}
                selectedIds={task.assigneeIds}
                disabled={!canManage}
                onChange={(ids) => handlers.onAssignees(task, ids)}
              />
            </Meta>

            <Meta
              label={
                task.startAt || task.endAt
                  ? `Dates: ${task.startAt ? `${formatDateTime(task.startAt)} to ` : ''}${
                      task.endAt ? formatDateTime(task.endAt) : 'no end'
                    }`
                  : 'Dates'
              }
            >
              <SchedulePicker
                startAt={task.startAt}
                endAt={task.endAt}
                disabled={!canManage}
                onChange={(value) => handlers.onSchedule(task, value)}
                trigger={
                  <span
                    className={clsx(
                      'flex items-center gap-1',
                      task.endAt
                        ? task.isOverdue
                          ? 'text-[var(--color-status-alert)]'
                          : 'text-[var(--color-ink-muted)]'
                        : 'text-[var(--color-ink-subtle)]',
                    )}
                  >
                    <CalendarIcon />
                    {task.endAt
                      ? `Due ${formatDateTime(task.endAt)}`
                      : task.startAt
                        ? `From ${formatDateTime(task.startAt)}`
                        : 'Set dates'}
                  </span>
                }
              />
            </Meta>

            <Meta label={`Priority: ${task.priority}`}>
              <PriorityPicker
                priority={task.priority}
                disabled={!canManage}
                onChange={(priority) => handlers.onPriority(task, priority)}
              />
              <span className="text-[var(--color-ink-muted)] capitalize">{task.priority}</span>
            </Meta>

            {task.folderName ? (
              <Meta label={`Folder: ${task.folderName}`}>
                <FolderGlyph />
                <span className="max-w-32 truncate text-[var(--color-ink-muted)]">
                  {task.folderName}
                </span>
              </Meta>
            ) : null}

            <Meta
              label={`Time: ${detail ? formatMinutes(detail.loggedMinutes) : '…'} logged by you${
                task.estimateMinutes ? `, ${formatMinutes(task.estimateMinutes)} estimated` : ''
              }`}
            >
              <ClockGlyph />
              <span className="text-[var(--color-ink-muted)] tabular-nums">
                {detail ? formatMinutes(detail.loggedMinutes) : '…'}
                {task.estimateMinutes ? ` / ${formatMinutes(task.estimateMinutes)}` : ''}
              </span>
            </Meta>
          </div>

          <div className="flex items-center gap-1.5 px-1 text-[13px]" title="Tags">
            <TagGlyph />
            {detail ? (
              <input
                key={`tags-${task.id}`}
                defaultValue={detail.tags.join(', ')}
                readOnly={!canManage}
                placeholder={canManage ? 'Tags, separated by commas' : '—'}
                onBlur={(event) => {
                  const next = event.target.value
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean);
                  handlers.onTags(task, next);
                }}
                className="min-w-0 flex-1 rounded-[var(--radius-control)] border border-transparent bg-transparent px-1 py-0.5 text-[13px] text-[var(--color-ink-muted)] hover:border-[var(--color-line)] focus:border-[var(--color-line-strong)] focus:outline-none"
              />
            ) : (
              <span className="text-[var(--color-ink-subtle)]">…</span>
            )}
          </div>

          <TeamsShare
            key={task.id}
            task={task}
            source={task.sourceTeamsMessageUrl}
            description={detail?.description}
          />
          <section>
            <h3 className="text-[11px] tracking-wide text-[var(--color-ink-subtle)] uppercase">
              Description
            </h3>

            {detail ? (
              <textarea
                key={`description-${task.id}`}
                defaultValue={detail.description ?? ''}
                readOnly={!canManage}
                rows={2}
                placeholder="What needs doing, and what done looks like."
                onBlur={(event) => {
                  const next = event.target.value;
                  if (next !== (detail.description ?? '')) handlers.onDescribe(task, next);
                }}
                className="mt-1 h-14 w-full resize-none rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-2 text-[13px] text-[var(--color-ink-muted)] transition-[height] duration-150 hover:h-36 focus:h-36 focus:border-[var(--color-line-strong)] focus:outline-none"
              />
            ) : (
              <p className="mt-1 text-[13px] text-[var(--color-ink-subtle)]">Loading</p>
            )}
          </section>

          {detail ? (
            <section>
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] tracking-wide text-[var(--color-ink-subtle)] uppercase">
                  Updates {detail.comments.length > 0 ? `· ${detail.comments.length}` : ''}
                </h3>
              </div>

              {canManage ? (
                <form
                  ref={commentForm}
                  action={commentFormAction}
                  className="mt-1 flex flex-wrap items-start gap-2"
                >
                  <input type="hidden" name="taskId" value={task.id} />
                  <MentionTextarea
                    people={detail.mentionable}
                    name="body"
                    maxLength={4000}
                    rows={1}
                    placeholder="Add an update, @ to mention"
                    wrapperClassName="min-w-0 flex-1"
                    className="h-9 w-full resize-none rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[13px] text-[var(--color-ink)] transition-[height] duration-150 focus:h-24 focus:border-[var(--color-line-strong)] focus:outline-none"
                  />
                  <div className="w-full">
                    <TicketAttachmentPicker
                      label="Upload attachment or paste an image"
                      imagesOnly
                      disabled={commentPending}
                    />
                  </div>
                  <Button type="submit" variant="secondary" disabled={commentPending}>
                    {commentPending ? 'Posting' : 'Post'}
                  </Button>
                </form>
              ) : null}
              {commentState.error ? <Notice tone="warn">{commentState.error}</Notice> : null}

              {detail.comments.length === 0 ? (
                <p className="mt-1 text-[13px] text-[var(--color-ink-subtle)]">No updates yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {[...detail.comments]
                    .sort(
                      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                    )
                    .slice(0, visibleUpdates)
                    .map((comment) => (
                      <article key={comment.id} className="chat-bubble chat-note-orange px-3 py-2">
                        <div className="flex flex-wrap items-baseline gap-x-2 text-xs">
                          <b className="text-[var(--chat-orange-name)]">{comment.authorName}</b>
                          <span className="text-[10px] uppercase text-[var(--chat-orange-name)]">
                            {comment.isSystem ? 'Activity' : 'Internal note'}
                          </span>
                          <span className="text-[var(--color-ink-subtle)]">
                            {formatDateTime(comment.createdAt)}
                            {comment.editedAt ? ' · edited' : ''}
                          </span>
                        </div>
                        <div className="mt-1">
                          <BubbleText text={comment.body} />
                          {comment.attachments?.length ? (
                            <ul className="mt-2 flex flex-wrap gap-2">
                              {comment.attachments.map((image) => (
                                <li key={image.id}>
                                  <AttachmentItem
                                    ticketId={task.id}
                                    attachmentBase="/api/tasks"
                                    attachment={{
                                      id: image.id,
                                      fileName: image.fileName,
                                      sizeLabel: `${Math.round(image.bytes / 1024)} KB`,
                                      previewable: [
                                        'image/png',
                                        'image/jpeg',
                                        'image/webp',
                                      ].includes(image.contentType),
                                    }}
                                  />
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  {visibleUpdates < detail.comments.length ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setVisibleUpdates((count) => count + 5)}
                    >
                      Show more ({detail.comments.length - visibleUpdates})
                    </Button>
                  ) : null}
                  {visibleUpdates > 3 && detail.comments.length > 3 ? (
                    <Button type="button" variant="secondary" onClick={() => setVisibleUpdates(3)}>
                      Show less
                    </Button>
                  ) : null}
                </div>
              )}
            </section>
          ) : null}

          <section>
            <h3 className="text-[11px] tracking-wide text-[var(--color-ink-subtle)] uppercase">
              Subtasks {task.subtaskCount > 0 ? `· ${task.subtasksDone}/${task.subtaskCount}` : ''}
            </h3>

            <ul className="mt-1 space-y-1">
              {task.subtasks.map((subtask) => (
                <li key={subtask.id} className="flex items-center gap-2">
                  <label className="flex flex-1 items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={subtask.done}
                      disabled={!canManage}
                      onChange={(event) =>
                        handlers.onSubtask(task, subtask.id, event.target.checked)
                      }
                      className="h-3.5 w-3.5"
                    />
                    <span
                      className={
                        subtask.done
                          ? 'text-[var(--color-ink-subtle)] line-through'
                          : 'text-[var(--color-ink-muted)]'
                      }
                    >
                      {subtask.title}
                    </span>
                  </label>

                  {canManage ? (
                    <select
                      aria-label={`Assign ${subtask.title}`}
                      value={subtask.assigneeId ?? ''}
                      onChange={(event) =>
                        handlers.onSubtaskAssignee(task, subtask.id, event.target.value || null)
                      }
                      className="max-w-28 truncate rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[12px] text-[var(--color-ink-muted)]"
                    >
                      <option value="">Unassigned</option>
                      {subtaskOptionsFor(subtask.assigneeId ?? null).map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  ) : subtask.assigneeId ? (
                    <span className="text-[12px] text-[var(--color-ink-subtle)]">
                      {handlers.users.find((user) => user.id === subtask.assigneeId)?.name ?? ''}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>

            {canManage ? (
              <form
                className="mt-2 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();

                  const title = subtaskTitle.trim();
                  if (!title) return;

                  setSubtaskTitle('');

                  startTransition(async () => {
                    const failure = await handlers.onAddSubtask(task, title);
                    if (failure) setError(failure);
                  });
                }}
              >
                <input
                  value={subtaskTitle}
                  onChange={(event) => setSubtaskTitle(event.target.value)}
                  placeholder="Add a subtask"
                  className="flex-1 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[13px] text-[var(--color-ink)]"
                />
                <Button type="submit" variant="secondary">
                  Add
                </Button>
              </form>
            ) : null}
          </section>
        </div>
      </aside>
    </div>
  );
}

/** One fact about the task: an icon or picker and a few words, its name in the tooltip. */
function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div title={label} className="flex items-center gap-1.5">
      {children}
    </div>
  );
}

const glyph = {
  width: 14,
  height: 14,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  className: 'shrink-0 text-[var(--color-ink-subtle)]',
};

function FolderGlyph() {
  return (
    <svg {...glyph}>
      <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.6l1.4 1.5h5A1.5 1.5 0 0 1 14 6v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z" />
    </svg>
  );
}

function ClockGlyph() {
  return (
    <svg {...glyph}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3.2l2 1.3" />
    </svg>
  );
}

function TagGlyph() {
  return (
    <svg {...glyph}>
      <path d="M2.5 8.2V3.5h4.7l6 6-4.7 4.7z" />
      <circle cx="5.2" cy="6" r=".8" />
    </svg>
  );
}
