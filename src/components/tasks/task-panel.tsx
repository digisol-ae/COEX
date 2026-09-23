'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { clsx } from 'clsx';
import { Button, Field, Input, Notice } from '@/components/ui';
import { StatusDot } from '@/components/ui/pill';
import { formatMinutes } from '@/modules/time/week';
import { formatDateTime } from '@/modules/tasks/dates';
import type { TaskSummary } from '@/modules/tasks/services/task.service';
import { addDocumentAction, removeDocumentAction, type TaskFormState } from '@/app/(app)/tasks/actions';
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
}

export interface PanelHandlers {
  users: { id: string; name: string }[];
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
  const [docState, docFormAction, docPending] = useActionState<TaskFormState, FormData>(
    addDocumentAction,
    {},
  );

  const { canManage, users } = handlers;
  const columns = handlers.columnsFor(task);

  function loadDetail() {
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
  }

  // The panel is mounted per task by its key, so this runs once for each task opened and detail
  // starts empty on its own rather than being cleared here.
  useEffect(() => {
    return loadDetail();
  }, [task.id]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (docState.saved) loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docState.saved]);

  function removeLink(linkId: string) {
    startTransition(async () => {
      const form = new FormData();
      form.set('taskId', task.id);
      form.set('linkId', linkId);
      await removeDocumentAction(form);
      loadDetail();
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close the task"
        onClick={onClose}
        className="flex-1 bg-[var(--color-ink)]/20"
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

          <Link
            href={`/tasks/${task.id}`}
            className="ml-auto text-[12px] text-[var(--color-ink-muted)] underline-offset-4 hover:underline"
          >
            Open full window
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
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

          <dl className="space-y-2 text-[13px]">
            <Row label="Owner">
              <AssigneePicker
                users={users}
                selectedIds={task.assigneeIds}
                disabled={!canManage}
                onChange={(ids) => handlers.onAssignees(task, ids)}
              />
            </Row>

            <Row label="Dates">
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
                    {task.startAt ? `${formatDateTime(task.startAt)} to ` : ''}
                    {task.endAt ? formatDateTime(task.endAt) : 'Set dates'}
                  </span>
                }
              />
            </Row>

            <Row label="Priority">
              <span className="flex items-center gap-1.5">
                <PriorityPicker
                  priority={task.priority}
                  disabled={!canManage}
                  onChange={(priority) => handlers.onPriority(task, priority)}
                />
                <span className="text-[var(--color-ink-muted)] capitalize">{task.priority}</span>
              </span>
            </Row>

            {task.folderName ? (
              <Row label="Folder">
                <span className="text-[var(--color-ink-muted)]">{task.folderName}</span>
              </Row>
            ) : null}

            <Row label="Hours">
              <span className="text-[var(--color-ink-muted)] tabular-nums">
                {detail ? formatMinutes(detail.loggedMinutes) : '…'} logged
                {task.plannedMinutes ? ` · ${formatMinutes(task.plannedMinutes)} planned` : ''}
                {task.estimateMinutes ? ` · ${formatMinutes(task.estimateMinutes)} estimated` : ''}
              </span>
            </Row>

            <Row label="Tags">
              {detail ? (
                <input
                  key={`tags-${task.id}`}
                  defaultValue={detail.tags.join(', ')}
                  readOnly={!canManage}
                  placeholder={canManage ? 'Separated by commas' : '—'}
                  onBlur={(event) => {
                    const next = event.target.value
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean);
                    handlers.onTags(task, next);
                  }}
                  className="w-full rounded-[var(--radius-control)] border border-transparent bg-transparent px-1 py-0.5 text-[13px] text-[var(--color-ink-muted)] hover:border-[var(--color-line)] focus:border-[var(--color-line-strong)] focus:outline-none"
                />
              ) : (
                <span className="text-[var(--color-ink-subtle)]">…</span>
              )}
            </Row>
          </dl>

          <section>
            <h3 className="text-[11px] tracking-wide text-[var(--color-ink-subtle)] uppercase">
              Description
            </h3>

            {detail ? (
              <textarea
                key={`description-${task.id}`}
                defaultValue={detail.description ?? ''}
                readOnly={!canManage}
                rows={5}
                placeholder="What needs doing, and what done looks like."
                onBlur={(event) => {
                  const next = event.target.value;
                  if (next !== (detail.description ?? '')) handlers.onDescribe(task, next);
                }}
                className="mt-1 w-full rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-2 text-[13px] text-[var(--color-ink-muted)] focus:border-[var(--color-line-strong)] focus:outline-none"
              />
            ) : (
              <p className="mt-1 text-[13px] text-[var(--color-ink-subtle)]">Loading</p>
            )}
          </section>

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
                      {handlers.users.map((user) => (
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

          {detail ? (
            <section>
              <h3 className="text-[11px] tracking-wide text-[var(--color-ink-subtle)] uppercase">
                Documents
              </h3>

              {detail.documentLinks.length > 0 ? (
                <ul className="mt-1 space-y-1">
                  {detail.documentLinks.map((link) => (
                    <li key={link.id} className="flex items-center justify-between gap-2">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 truncate text-[13px] text-[var(--color-ink)] underline-offset-4 hover:underline"
                      >
                        {link.title}
                      </a>

                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => removeLink(link.id)}
                          className="shrink-0 text-[11px] text-[var(--color-ink-subtle)] underline-offset-4 hover:underline"
                        >
                          Remove
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-[13px] text-[var(--color-ink-subtle)]">None linked.</p>
              )}

              {canManage ? (
                <form action={docFormAction} className="mt-2 flex gap-2">
                  <input type="hidden" name="taskId" value={task.id} />
                  <Input
                    name="url"
                    placeholder="https://digisol.sharepoint.com/..."
                    className="flex-1 text-[13px]"
                  />
                  <Button type="submit" variant="secondary" disabled={docPending}>
                    {docPending ? 'Adding' : 'Add'}
                  </Button>
                </form>
              ) : null}

              {docState.error ? <Notice tone="alert">{docState.error}</Notice> : null}
            </section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <dt className="w-20 shrink-0 text-[var(--color-ink-subtle)]">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}
