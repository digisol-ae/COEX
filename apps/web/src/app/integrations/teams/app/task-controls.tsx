'use client';
import { useState } from 'react';
import { teamsTabRequest } from '@/modules/integrations/teams/tab-client';
import { toDateKey } from '@coex/shared/time/week';

export type TeamsTimeEntry = {
  id: string;
  workDate: string;
  minutes: number;
  note: string;
  billable: boolean;
  locked: boolean;
};
const control = 'rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-2';
export function TaskControls({
  taskId,
  assigneeIds,
  people,
  canAssign,
  entries,
  onChanged,
}: {
  taskId: string;
  assigneeIds: string[];
  people: { id: string; name: string }[];
  canAssign: boolean;
  entries: TeamsTimeEntry[];
  onChanged: () => Promise<void>;
}) {
  const [selected, setSelected] = useState(assigneeIds);
  const [editing, setEditing] = useState<TeamsTimeEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function send(action: string, data: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await teamsTabRequest(action, { taskId, ...data });
      setEditing(null);
      await onChanged();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save. Refresh before retrying.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="my-5 space-y-4" aria-label="Task assignment and your time">
      {error && <p role="alert">{error}</p>}
      {canAssign && (
        <fieldset disabled={busy} className="space-y-2">
          <legend className="font-semibold">Assigned agents</legend>
          {people.map((person) => (
            <label key={person.id} className="flex gap-2">
              <input
                type="checkbox"
                checked={selected.includes(person.id)}
                onChange={(event) =>
                  setSelected(
                    event.target.checked
                      ? [...selected, person.id]
                      : selected.filter((id) => id !== person.id),
                  )
                }
              />
              {person.name}
            </label>
          ))}
          <button
            className={control}
            onClick={() => void send('assign', { assigneeIds: selected })}
          >
            Save assignment
          </button>
        </fieldset>
      )}
      <h2 className="font-semibold">Your time</h2>
      <button className={control} disabled={busy} onClick={() => void send('timerStart', {})}>
        Start my timer
      </button>
      <p className="text-sm">Starting a timer stops your previous running timer.</p>
      <form
        key={editing?.id ?? 'new'}
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void send(editing ? 'timeEdit' : 'timeAdd', {
            ...(editing ? { entryId: editing.id, reason: String(form.get('reason')) } : {}),
            workDate: String(form.get('workDate')),
            duration: Number(form.get('minutes')),
            note: String(form.get('note')),
            billable: form.get('billable') === 'on',
          });
        }}
      >
        <label>
          Date
          <input
            className={control + ' block'}
            name="workDate"
            type="date"
            required
            defaultValue={editing?.workDate ?? toDateKey(new Date())}
          />
        </label>
        <label>
          Minutes
          <input
            className={control + ' block w-28'}
            name="minutes"
            type="number"
            min="1"
            max="1440"
            required
            defaultValue={editing?.minutes}
          />
        </label>
        <label>
          Note
          <input
            className={control + ' block'}
            name="note"
            maxLength={2000}
            defaultValue={editing?.note}
          />
        </label>
        <label>
          <input type="checkbox" name="billable" defaultChecked={editing?.billable ?? false} />{' '}
          Billable
        </label>
        {editing && (
          <label>
            Reason for correction
            <input className={control + ' block'} name="reason" required maxLength={500} />
          </label>
        )}
        <button className={control} disabled={busy}>
          {editing ? 'Save time correction' : 'Add my time'}
        </button>
        {editing && (
          <button
            type="button"
            className={control}
            disabled={busy}
            onClick={() => setEditing(null)}
          >
            Cancel edit
          </button>
        )}
      </form>
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li key={entry.id} className="flex flex-wrap items-center gap-2">
            <span>
              {entry.workDate} · {entry.minutes} min · {entry.note}
            </span>
            <button
              className={control}
              disabled={busy || entry.locked}
              onClick={() => setEditing(entry)}
            >
              {entry.locked ? 'Week locked' : 'Edit my time'}
            </button>
          </li>
        ))}
      </ul>
      {!entries.length && <p>No saved time for you on this task.</p>}
    </section>
  );
}
