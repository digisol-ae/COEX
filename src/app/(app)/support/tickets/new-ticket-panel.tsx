'use client';

import { useActionState, useState } from 'react';
import { Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import { createTicketAction, type SupportFormState } from '../actions';

const initialState: SupportFormState = {};

/** Raising a ticket on someone's behalf: a phone call, a corridor conversation, a WhatsApp. */
export function NewTicketPanel({
  queues,
  organisations,
}: {
  queues: { id: string; name: string }[];
  organisations: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createTicketAction, initialState);

  if (!open) return <Button onClick={() => setOpen(true)}>Raise ticket</Button>;

  return (
    <Card className="w-full sm:w-[28rem]">
      <CardSection title="New ticket">
        <form action={formAction} className="space-y-3">
          <Field label="Subject">
            <Input name="subject" required autoFocus />
          </Field>

          <Field label="What happened" hint="The first message on the ticket">
            <textarea
              name="body"
              required
              rows={4}
              className="w-full rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)]"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Queue">
              <Select name="queueId" required defaultValue={queues[0]?.id ?? ''}>
                {queues.map((queue) => (
                  <option key={queue.id} value={queue.id}>
                    {queue.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Priority">
              <Select name="priority" defaultValue="normal">
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </Select>
            </Field>
          </div>

          <Field label="Customer" hint="Optional, but it puts the ticket on their timeline">
            <Select name="organisationId" defaultValue="">
              <option value="">No customer</option>
              {organisations.map((organisation) => (
                <option key={organisation.id} value={organisation.id}>
                  {organisation.name}
                </option>
              ))}
            </Select>
          </Field>

          {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={pending}>
              {pending ? 'Raising' : 'Raise ticket'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardSection>
    </Card>
  );
}
