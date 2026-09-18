'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import { createTicketAction, type SupportFormState } from '../actions';

const initialState: SupportFormState = {};

interface Contact {
  id: string;
  name: string;
  title: string | null;
}

/**
 * Raising a ticket, either ours or the customer's.
 *
 * Most tickets an agent types in are not the agent's own question: they are a phone call, a
 * corridor conversation, a WhatsApp read on someone's own phone. Recorded as our message, every
 * one of those would stop the first reply clock at the moment of creation and the desk report
 * would show a service level nobody actually delivered. So the panel asks whose words these are,
 * and on behalf of the customer is the default, because it is the common case.
 */
export function NewTicketPanel({
  queues,
  organisations,
}: {
  queues: { id: string; name: string }[];
  organisations: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [organisationId, setOrganisationId] = useState('');
  // Kept with the customer they belong to, so a stale list from the previous choice can never be
  // shown beside a new one.
  const [loaded, setLoaded] = useState<{ organisationId: string; contacts: Contact[] }>({
    organisationId: '',
    contacts: [],
  });
  const [onBehalf, setOnBehalf] = useState(true);
  const [state, formAction, pending] = useActionState(createTicketAction, initialState);

  useEffect(() => {
    if (!organisationId) return;

    let live = true;

    fetch(`/api/crm/contacts?organisationId=${organisationId}`)
      .then((response) => (response.ok ? response.json() : { contacts: [] }))
      .then((payload: { contacts: Contact[] }) => {
        if (live) setLoaded({ organisationId, contacts: payload.contacts });
      })
      .catch(() => {
        if (live) setLoaded({ organisationId, contacts: [] });
      });

    return () => {
      live = false;
    };
  }, [organisationId]);

  const contacts = loaded.organisationId === organisationId ? loaded.contacts : [];

  if (!open) return <Button onClick={() => setOpen(true)}>Raise ticket</Button>;

  return (
    <Card className="w-full sm:w-[28rem]">
      <CardSection title="New ticket">
        <form action={formAction} className="space-y-3">
          <fieldset className="rounded-[var(--radius-control)] border border-[var(--color-line)] p-2.5">
            <legend className="px-1 text-[11px] tracking-wide text-[var(--color-ink-subtle)] uppercase">
              Whose words are these
            </legend>

            <div className="flex flex-wrap gap-3 text-[13px]">
              <label className="flex items-center gap-1.5 text-[var(--color-ink-muted)]">
                <input
                  type="radio"
                  name="onBehalf"
                  value="yes"
                  checked={onBehalf}
                  onChange={() => setOnBehalf(true)}
                />
                The customer&rsquo;s, recorded by me
              </label>

              <label className="flex items-center gap-1.5 text-[var(--color-ink-muted)]">
                <input
                  type="radio"
                  name="onBehalf"
                  value="no"
                  checked={!onBehalf}
                  onChange={() => setOnBehalf(false)}
                />
                Mine
              </label>
            </div>

            <p className="mt-1.5 text-[11px] text-[var(--color-ink-subtle)]">
              {onBehalf
                ? 'Recorded as a message from the customer, so the first reply clock keeps running until someone answers.'
                : 'Recorded as our own message, which counts as the first reply.'}
            </p>
          </fieldset>

          <Field label="Subject">
            <Input name="subject" required autoFocus />
          </Field>

          <Field
            label={onBehalf ? 'What the customer told you' : 'What happened'}
            hint="The first message on the ticket"
          >
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

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer" hint="Puts the ticket on their timeline">
              <Select
                name="organisationId"
                value={organisationId}
                onChange={(event) => setOrganisationId(event.target.value)}
              >
                <option value="">No customer</option>
                {organisations.map((organisation) => (
                  <option key={organisation.id} value={organisation.id}>
                    {organisation.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Contact"
              hint={organisationId ? 'Who reported it' : 'Choose a customer first'}
            >
              <Select name="contactId" defaultValue="" disabled={contacts.length === 0}>
                <option value="">Not recorded</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                    {contact.title ? ` · ${contact.title}` : ''}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <label className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--color-ink-muted)]">
            <span className="rounded-[var(--radius-control)] border border-[var(--color-line)] px-2.5 py-1 transition-colors hover:text-[var(--color-ink)]">
              Attach files
            </span>
            <input
              type="file"
              name="files"
              multiple
              className="text-[11px] text-[var(--color-ink-subtle)] file:hidden"
            />
          </label>

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
