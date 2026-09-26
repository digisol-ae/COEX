'use client';

import { useEffect, useState, useTransition, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { Badge, Button, Field, Input, Notice, Select, Td } from '@/components/ui';
import { formatMinutes, toDateKey } from '@/modules/time/week';
import { entryHistoryAction, removeTimeAction, saveEntryAction } from './actions';

export interface Entry {
  id: string;
  taskId: string;
  taskNumber: string;
  taskTitle: string;
  spaceName: string;
  organisationName: string | null;
  workDate: string;
  minutes: number;
  note: string | null;
  billable: boolean;
  running: boolean;
  locked: boolean;
  edited: boolean;
}

interface HistoryRow {
  id: string;
  action: string;
  at: string;
  actorName: string;
  summary: string;
}

/**
 * One line of a timesheet, correctable in place.
 *
 * People write down time at the end of a day they have already half forgotten, so the first
 * version is often wrong: the wrong number, the wrong day, or the right work against the wrong
 * task. Making them delete and retype the row loses the note and the history with it. Every field
 * that could be wrong is editable here, and every change is recorded.
 *
 * The history sits on the row rather than only on the administrative audit screen, because the
 * question people actually ask is "why does this say ninety minutes when I remember two hours",
 * and that question is about one row.
 *
 * Editing, removing and the history open in popups over the timesheet. Opening them inside the
 * table pushed every row below down the page, which John found jarring (26 Sep 2026).
 */
export function EntryRow({
  entry,
  tasks,
  canEdit,
}: {
  entry: Entry;
  tasks: { id: string; label: string }[];
  canEdit: boolean;
  /** Kept for callers; popups no longer need the table's column count. */
  columns?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  const day = new Date(entry.workDate).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const subtitle = `${day} · ${`${entry.taskNumber} ${entry.taskTitle}`.trim()}`;

  function openHistory() {
    setShowHistory(true);
    if (history === null) {
      startTransition(async () => {
        const result = await entryHistoryAction(entry.id);
        setHistory(result.rows);
      });
    }
  }

  function close(setter: (open: boolean) => void) {
    setError(null);
    setter(false);
  }

  return (
    <>
      <tr className="group">
        <Td className="whitespace-nowrap text-[var(--color-ink-muted)]">
          {new Date(entry.workDate).toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
          })}
        </Td>

        <Td>
          <span className="font-mono text-xs text-[var(--color-ink-subtle)]">
            {entry.taskNumber}
          </span>{' '}
          <span className="text-[var(--color-ink)]">{entry.taskTitle}</span>
          {entry.note ? (
            <div className="text-xs text-[var(--color-ink-subtle)]">{entry.note}</div>
          ) : null}
        </Td>

        <Td className="text-[var(--color-ink-muted)]">
          {entry.organisationName ?? entry.spaceName}
        </Td>

        <Td className="text-[var(--color-ink)] tabular-nums">
          {entry.running ? 'running' : formatMinutes(entry.minutes)}
          {entry.edited ? (
            <button
              type="button"
              onClick={openHistory}
              title="This entry was changed. Open its history."
              className="ml-1.5 text-[10px] text-[var(--color-ink-subtle)] underline underline-offset-2 hover:text-[var(--color-ink)]"
            >
              edited
            </button>
          ) : null}
        </Td>

        <Td>{entry.billable ? <Badge tone="ok">billable</Badge> : null}</Td>

        <Td>
          <div
            className={clsx(
              'flex items-center justify-end gap-2 text-xs transition-opacity',
              // A phone has no hover, so there the actions stay visible.
              'md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100',
            )}
          >
            <button
              type="button"
              onClick={openHistory}
              className="text-[var(--color-ink-subtle)] underline-offset-4 hover:underline"
            >
              History
            </button>

            {canEdit && !entry.locked && !entry.running ? (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-[var(--color-ink-muted)] underline-offset-4 hover:underline"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => setRemoving(true)}
                  className="text-[var(--color-ink-subtle)] underline-offset-4 hover:underline"
                >
                  Remove
                </button>
              </>
            ) : null}
          </div>
        </Td>
      </tr>

      {editing ? (
        <Popup title="Correct this entry" subtitle={subtitle} onClose={() => close(setEditing)}>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();

              const data = new FormData(event.currentTarget);
              setError(null);

              startTransition(async () => {
                const result = await saveEntryAction({
                  id: entry.id,
                  duration: String(data.get('duration') ?? ''),
                  note: String(data.get('note') ?? ''),
                  billable: data.get('billable') !== null,
                  workDate: String(data.get('workDate') ?? ''),
                  taskId: String(data.get('taskId') ?? ''),
                  reason: String(data.get('reason') ?? ''),
                });

                if (result.error) setError(result.error);
                else setEditing(false);
              });
            }}
          >
            <Field label="Day">
              <Input
                name="workDate"
                type="date"
                required
                // The day in the reader's own time. Slicing the stored UTC value gave the day
                // before for anyone east of Greenwich, so saving any correction in Dubai or
                // Karachi quietly moved the entry back a day (found in QA, 26 Sep 2026).
                defaultValue={toDateKey(new Date(entry.workDate))}
              />
            </Field>

            <Field label="Time" hint="1.5, 1:30 or 90m">
              <Input name="duration" required defaultValue={formatMinutes(entry.minutes)} />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Task">
                <Select name="taskId" defaultValue={entry.taskId}>
                  {tasks.some((task) => task.id === entry.taskId) ? null : (
                    <option value={entry.taskId}>
                      {entry.taskNumber} {entry.taskTitle}
                    </option>
                  )}
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Note" hint="Optional. What the time went on.">
                <Input name="note" defaultValue={entry.note ?? ''} />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)] sm:col-span-2">
              <input type="checkbox" name="billable" defaultChecked={entry.billable} />
              Billable
            </label>

            <div className="sm:col-span-2">
              <Field label="Reason for the change" hint="Required. Shown in this entry's history.">
                <Input name="reason" required maxLength={500} autoFocus />
              </Field>
            </div>

            <div className="sm:col-span-2">
              {error ? <Notice tone="alert">{error}</Notice> : null}

              <div className="mt-2 flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => close(setEditing)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving' : 'Save change'}
                </Button>
              </div>

              <p className="mt-2 text-[11px] text-[var(--color-ink-subtle)]">
                The change is recorded with what it was before, so a corrected timesheet can always
                be explained.
              </p>
            </div>
          </form>
        </Popup>
      ) : null}

      {removing ? (
        <Popup title="Remove this time?" subtitle={subtitle} onClose={() => close(setRemoving)}>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const reason = String(new FormData(event.currentTarget).get('reason') ?? '');
              setError(null);
              startTransition(async () => {
                const result = await removeTimeAction({ id: entry.id, reason });
                if (result.error) setError(result.error);
                else setRemoving(false);
              });
            }}
          >
            <p className="text-sm text-[var(--color-ink-muted)]">
              {formatMinutes(entry.minutes)} will come off this timesheet. The entry and your reason
              stay in the history.
            </p>
            <Field label="Why remove this time?" hint="Required.">
              <Input name="reason" required maxLength={500} autoFocus />
            </Field>
            {error ? <Notice tone="alert">{error}</Notice> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => close(setRemoving)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Removing' : 'Remove'}
              </Button>
            </div>
          </form>
        </Popup>
      ) : null}

      {showHistory ? (
        <Popup
          title="History of this entry"
          subtitle={subtitle}
          onClose={() => setShowHistory(false)}
        >
          {history === null ? (
            <p className="text-sm text-[var(--color-ink-subtle)]">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-[var(--color-ink-subtle)]">
              Nothing recorded against this entry.
            </p>
          ) : (
            <ol className="space-y-3">
              {history.map((row) => (
                <li key={row.id} className="border-l-2 border-[var(--color-line)] pl-3 text-sm">
                  <p className="text-xs text-[var(--color-ink-subtle)] tabular-nums">
                    {new Date(row.at).toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    ·{' '}
                    <span className="font-medium text-[var(--color-ink-muted)]">
                      {row.actorName}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[var(--color-ink)]">{row.summary}</p>
                </li>
              ))}
            </ol>
          )}
        </Popup>
      ) : null}
    </>
  );
}

/** A popup over the page: closes on ✕, Escape, or a click outside it. */
function Popup({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return createPortal(
    <div
      className="popup-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="popup-glass max-h-[90vh] w-full max-w-lg overflow-y-auto p-5"
        // Mouse down rather than click, so selecting text and releasing outside keeps it open.
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-medium text-[var(--color-ink)]">{title}</h2>
            <p className="mt-0.5 truncate text-xs text-[var(--color-ink-subtle)]">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-ink-subtle)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
