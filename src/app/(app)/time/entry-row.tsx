'use client';

import { useState, useTransition } from 'react';
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
 */
export function EntryRow({
  entry,
  tasks,
  canEdit,
  columns,
}: {
  entry: Entry;
  tasks: { id: string; label: string }[];
  canEdit: boolean;
  columns: number;
}) {
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();

  function toggleHistory() {
    const next = !showHistory;
    setShowHistory(next);

    if (next && history === null) {
      startTransition(async () => {
        const result = await entryHistoryAction(entry.id);
        setHistory(result.rows);
      });
    }
  }

  if (editing) {
    return (
      <tr className="bg-[var(--color-surface-muted)]/50">
        <td colSpan={columns} className="px-3 py-3">
          <form
            className="grid gap-3 sm:grid-cols-5"
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

                // Closing on success keeps the row where the eye already is.
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

            <Field label="Time" hint="1.5, 1:30 or 90m">
              <Input name="duration" required defaultValue={formatMinutes(entry.minutes)} />
            </Field>

            <label className="flex items-end gap-2 pb-2 text-sm text-[var(--color-ink-muted)]">
              <input type="checkbox" name="billable" defaultChecked={entry.billable} />
              Billable
            </label>

            <div className="sm:col-span-5">
              <Field label="Note" hint="Optional. What the time went on.">
                <Input name="note" defaultValue={entry.note ?? ''} />
              </Field>
            </div>

            <div className="sm:col-span-5">
              <Field label="Reason for the change" hint="Required. Shown in this entry's history.">
                <Input name="reason" required maxLength={500} />
              </Field>
            </div>

            <div className="sm:col-span-5">
              {error ? <Notice tone="alert">{error}</Notice> : null}

              <div className="mt-2 flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving' : 'Save change'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>

              <p className="mt-2 text-[11px] text-[var(--color-ink-subtle)]">
                The change is recorded with what it was before, so a corrected timesheet can always
                be explained.
              </p>
            </div>
          </form>
        </td>
      </tr>
    );
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
              onClick={toggleHistory}
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
              'opacity-0 group-hover:opacity-100 focus-within:opacity-100',
            )}
          >
            <button
              type="button"
              onClick={toggleHistory}
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

      {removing ? (
        <tr className="bg-[var(--color-surface-muted)]/50">
          <td colSpan={columns} className="px-3 py-3">
            <form
              className="flex flex-wrap items-end gap-2"
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
              <div className="min-w-60 flex-1">
                <Field label="Why remove this time?" hint="Required. Kept in the history.">
                  <Input name="reason" required maxLength={500} autoFocus />
                </Field>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Removing' : 'Remove'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setRemoving(false)}>
                Cancel
              </Button>
              {error ? (
                <div className="w-full">
                  <Notice tone="alert">{error}</Notice>
                </div>
              ) : null}
            </form>
          </td>
        </tr>
      ) : null}

      {showHistory ? (
        <tr>
          <td colSpan={columns} className="bg-[var(--color-surface-sunken)]/50 px-3 py-2">
            {history === null ? (
              <p className="text-[11px] text-[var(--color-ink-subtle)]">Loading</p>
            ) : history.length === 0 ? (
              <p className="text-[11px] text-[var(--color-ink-subtle)]">
                Nothing recorded against this entry.
              </p>
            ) : (
              <ol className="space-y-1">
                {history.map((row) => (
                  <li key={row.id} className="flex flex-wrap gap-x-2 text-[11px]">
                    <span className="text-[var(--color-ink-subtle)] tabular-nums">
                      {new Date(row.at).toLocaleString('en-GB')}
                    </span>
                    <span className="font-medium text-[var(--color-ink-muted)]">
                      {row.actorName}
                    </span>
                    <span className="text-[var(--color-ink-muted)]">{row.summary}</span>
                  </li>
                ))}
              </ol>
            )}
          </td>
        </tr>
      ) : null}
    </>
  );
}
