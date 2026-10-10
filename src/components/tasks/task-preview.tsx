'use client';
import { useEffect, useRef, useState } from 'react';
import type { TaskOrigin, TaskSummary } from '@/modules/tasks/services/task.service';
import { formatDateTime } from '@/modules/tasks/dates';
import { formatMinutes } from '@/modules/time/week';
import { IconButton, IconLink } from '@/components/ui/icon-button';
import { DeskTaskButton } from './desk-task-button';
import { TaskOriginLines } from './task-origin';

type Detail = {
  description: string | null;
  tags: string[];
  documentLinks: { id: string; url: string; title: string }[];
  loggedMinutes: number;
  sourceTicket: { id: string; number: string } | null;
  origin: TaskOrigin;
  viewerId: string;
};

export function TaskPreview({ task, onClose }: { task: TaskSummary; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    dialog.current?.showModal();
    fetch('/api/tasks/' + task.id + '/panel', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Could not load this task.');
        return response.json();
      })
      .then((payload: Detail) => setDetail(payload))
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [task.id]);

  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="task-preview-title"
      className="popup-glass m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto p-5 text-[var(--color-ink)] backdrop:bg-black/50"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-[var(--color-ink-subtle)]">
            {task.number} · {task.spaceName}
          </p>
          <h2 id="task-preview-title" className="mt-1 text-lg font-semibold">
            {task.title}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <DeskTaskButton taskId={task.id} assigneeIds={task.assigneeIds} />
          <IconLink icon="open" label="Open task" href={'/tasks/' + task.id} />
          <IconButton icon="close" label="Close preview" onClick={onClose} />
        </div>
      </header>
      <dl className="my-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[var(--color-ink-subtle)]">Status</dt>
          <dd>{task.status}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-ink-subtle)]">Priority</dt>
          <dd>{task.priority}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-ink-subtle)]">Due</dt>
          <dd>{task.endAt ? formatDateTime(task.endAt) : 'No date'}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-ink-subtle)]">Your time</dt>
          <dd>{formatMinutes(detail?.loggedMinutes ?? task.loggedMinutes)}</dd>
        </div>
      </dl>
      {error ? (
        <p role="alert" className="text-sm text-[var(--color-status-alert)]">
          {error}
        </p>
      ) : !detail ? (
        <p role="status" className="text-sm text-[var(--color-ink-muted)]">
          Loading details…
        </p>
      ) : (
        <>
          <TaskOriginLines
            origin={detail.origin}
            viewerId={detail.viewerId}
            people={task.assigneeIds.map((id, index) => ({
              id,
              name: task.assigneeNames[index] ?? '',
            }))}
            className="mb-3 space-y-0.5 text-xs text-[var(--color-ink-muted)]"
          />
          <p className="whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">
            {detail.description || 'No description.'}
          </p>
          {detail.tags.length ? (
            <p className="mt-3 text-xs text-[var(--color-ink-subtle)]">{detail.tags.join(', ')}</p>
          ) : null}
          {detail.documentLinks.length ? (
            <ul className="mt-4 space-y-2 text-sm">
              {detail.documentLinks.map((link) => (
                <li key={link.id}>
                  <a href={link.url} target="_blank" rel="noreferrer" className="underline">
                    {link.title || link.url}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
      {task.subtasks.length ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Subtasks</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {task.subtasks.map((item) => (
              <li key={item.id}>
                {item.done ? '✓' : '○'} {item.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </dialog>
  );
}
