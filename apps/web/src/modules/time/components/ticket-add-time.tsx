'use client';

import { useActionState, useState } from 'react';
import { Button, Field, Input, Notice } from '@/components/ui';
import { toDateKey } from '@coex/shared/time/week';
import { addTimeAction, type TimeFormState } from '@/app/(app)/time/actions';

const initialState: TimeFormState = {};

/**
 * Adds time to a ticket by hand, for the agent who forgot to start the timer (John's team,
 * 17 Oct 2026). The same action and rules as the timesheet's Add time: a locked week refuses it,
 * and the entry shows in the ticket's time entries and on the person's timesheet.
 */
export function TicketAddTime({ ticketId }: { ticketId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previous: TimeFormState, formData: FormData) => {
      const result = await addTimeAction(previous, formData);
      if (result.saved) setOpen(false);
      return result;
    },
    initialState,
  );

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Add time
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="popup-backdrop absolute inset-0"
          />

          <form action={formAction} className="popup-glass relative w-full max-w-sm space-y-3 p-4">
            <h2 className="font-medium text-[var(--color-ink)]">Add time to this ticket</h2>
            <input type="hidden" name="item" value={`ticket:${ticketId}`} />

            <Field label="Day">
              <Input name="workDate" type="date" required defaultValue={toDateKey(new Date())} />
            </Field>

            <Field label="Time" hint="1.5, 1:30 or 90m">
              <Input name="duration" required placeholder="1:30" autoFocus />
            </Field>

            <Field label="Note" hint="Optional. What the time went on.">
              <Input name="note" />
            </Field>

            <label className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
              <input type="checkbox" name="billable" />
              Billable
            </label>

            {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Adding' : 'Add time'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
