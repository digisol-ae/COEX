'use client';
import { UI_LABELS } from '@/components/ui/labels';

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
export function TicketAddTime({
  ticketId,
  compact = false,
}: {
  ticketId: string;
  compact?: boolean;
}) {
  return <ItemAddTime itemId={ticketId} kind="ticket" compact={compact} />;
}

export function TaskAddTime({ taskId, compact = false }: { taskId: string; compact?: boolean }) {
  return <ItemAddTime itemId={taskId} kind="task" compact={compact} />;
}

function ItemAddTime({
  itemId,
  kind,
  compact,
}: {
  itemId: string;
  kind: 'ticket' | 'task';
  compact: boolean;
}) {
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
      <Button
        type="button"
        variant="secondary"
        className={compact ? '!px-2.5 !py-1 text-[12px]' : undefined}
        onClick={() => setOpen(true)}
      >
        {UI_LABELS.addTime}
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={UI_LABELS.close}
            onClick={() => setOpen(false)}
            className="popup-backdrop absolute inset-0"
          />

          <form action={formAction} className="popup-glass relative w-full max-w-sm space-y-3 p-4">
            <h2 className="font-medium text-[var(--color-ink)]">Add time to this {kind}</h2>
            {kind === 'task' ? <input type="hidden" name="taskId" value={itemId} /> : null}
            <input type="hidden" name="item" value={`${kind}:${itemId}`} />

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
                {UI_LABELS.cancel}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? UI_LABELS.adding : UI_LABELS.addTime}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
