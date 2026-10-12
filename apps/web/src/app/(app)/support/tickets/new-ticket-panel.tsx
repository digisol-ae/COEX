'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { Button, Field, Input, Notice, Select } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { createTicketAction, quickCreateCustomerAction, type SupportFormState } from '../actions';

import { TicketAttachmentPicker } from '@/components/ui/ticket-attachment-picker';

import { CollaboratorPicker } from './collaborator-picker';
import type { CollaboratorOption } from '@coex/shared/tickets/collaborators';

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
  collaboratorOptions,
}: {
  collaboratorOptions: CollaboratorOption[];
  queues: { id: string; name: string }[];
  organisations: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerError, setCustomerError] = useState('');
  const [savingCustomer, startCustomerTransition] = useTransition();
  const [addedCustomers, setAddedCustomers] = useState<{ id: string; name: string }[]>([]);

  const [organisationId, setOrganisationId] = useState('');
  // Kept with the customer they belong to, so a stale list from the previous choice can never be
  // shown beside a new one.
  const [loaded, setLoaded] = useState<{ organisationId: string; contacts: Contact[] }>({
    organisationId: '',
    contacts: [],
  });
  const [onBehalf, setOnBehalf] = useState(true);
  const { showToast } = useToast();
  const [state, formAction, pending] = useActionState(
    async (previous: SupportFormState, formData: FormData) => {
      const result = await createTicketAction(previous, formData);
      if (result.saved) {
        setOpen(false);
        showToast('Ticket created.');
      }
      return result;
    },
    initialState,
  );

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

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  const button = <Button onClick={() => setOpen(true)}>Raise ticket</Button>;
  if (!open) return button;

  // A popup over the list rather than a card inside it, so the page never jumps (John, 28 Sep).
  return (
    <>
      {button}
      {createPortal(
        <div
          className="popup-backdrop-light fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center"
          onMouseDown={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="New ticket"
            className="popup-glass-gradient my-auto w-full max-w-lg p-5"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--color-ink)]">New ticket</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-ink-subtle)] hover:bg-white/60 hover:text-[var(--color-ink)]"
              >
                ✕
              </button>
            </div>
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
                    onChange={(event) => {
                      if (event.target.value === '__create__') setCreatingCustomer(true);
                      else {
                        setOrganisationId(event.target.value);
                        setCreatingCustomer(false);
                      }
                    }}
                  >
                    <option value="">No customer</option>
                    <option value="__create__">Create customer…</option>
                    {[
                      ...organisations,
                      ...addedCustomers.filter(
                        (row) => !organisations.some((existing) => existing.id === row.id),
                      ),
                    ].map((organisation) => (
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

              {creatingCustomer ? (
                <fieldset
                  disabled={savingCustomer}
                  className="space-y-2 rounded-[var(--radius-control)] border border-[var(--color-line)] p-3"
                >
                  <legend className="px-1 text-xs font-medium">Create customer</legend>
                  <Field label="Customer name">
                    <Input
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                    />
                  </Field>
                  <Field label="Email address">
                    <Input
                      type="email"
                      value={customerEmail}
                      onChange={(event) => setCustomerEmail(event.target.value)}
                    />
                  </Field>
                  <p className="text-[11px] text-[var(--color-ink-subtle)]">
                    You can edit these details later in Customers.
                  </p>
                  {customerError ? <Notice tone="alert">{customerError}</Notice> : null}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={() =>
                        startCustomerTransition(async () => {
                          const result = await quickCreateCustomerAction({
                            name: customerName,
                            email: customerEmail,
                          });
                          if (result.customer) {
                            setAddedCustomers((rows) => [...rows, result.customer!]);
                            setOrganisationId(result.customer.id);
                            setCreatingCustomer(false);
                            setCustomerName('');
                            setCustomerEmail('');
                            setCustomerError('');
                            showToast('Customer created and selected.');
                          } else setCustomerError(result.error ?? 'Could not create customer.');
                        })
                      }
                    >
                      {savingCustomer ? 'Creating' : 'Create and select'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setCreatingCustomer(false);
                        setCustomerError('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </fieldset>
              ) : null}
              <CollaboratorPicker options={collaboratorOptions} disabled={pending} />
              <TicketAttachmentPicker disabled={pending} />

              {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={pending || savingCustomer || creatingCustomer}>
                  {pending ? 'Raising' : 'Raise ticket'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
