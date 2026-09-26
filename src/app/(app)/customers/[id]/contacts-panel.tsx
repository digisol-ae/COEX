'use client';

import { useActionState, useState } from 'react';
import { Button, Card, CardSection, EmptyState, Field, Input, Notice } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import type { ContactSummary } from '@/modules/crm/services/contact.service';
import { MobileInput } from '@/modules/crm/components/mobile-input';
import { addContactAction, archiveContactAction, type CrmFormState } from '../actions';

const initialState: CrmFormState = {};

export function ContactsPanel({
  organisationId,
  contacts,
  canWrite,
}: {
  organisationId: string;
  contacts: ContactSummary[];
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addContactAction, initialState);

  return (
    <Card>
      <CardSection title={`Contacts · ${contacts.length}`}>
        {contacts.length === 0 ? (
          <EmptyState message="No contacts yet." />
        ) : (
          <ul className="space-y-3">
            {contacts.map((contact) => (
              <li key={contact.id} className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-[var(--color-ink)]">
                    {contact.name}
                    {contact.isPrimary ? (
                      <span className="ml-2 text-xs text-[var(--color-ink-subtle)]">primary</span>
                    ) : null}
                  </p>
                  {contact.title ? (
                    <p className="text-xs text-[var(--color-ink-subtle)]">{contact.title}</p>
                  ) : null}
                  {contact.email ? (
                    <p className="text-xs text-[var(--color-ink-muted)]">{contact.email}</p>
                  ) : null}
                  {contact.mobile ? (
                    <p className="text-xs text-[var(--color-ink-muted)]">{contact.mobile}</p>
                  ) : null}
                </div>

                {canWrite ? (
                  <form action={archiveContactAction}>
                    <input type="hidden" name="id" value={contact.id} />
                    <input type="hidden" name="organisationId" value={organisationId} />
                    <IconButton type="submit" icon="remove" label="Remove this contact" tone="danger" />
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canWrite ? (
          open ? (
            <form
              action={formAction}
              className="mt-4 space-y-3 border-t border-[var(--color-line)] pt-4"
            >
              <input type="hidden" name="organisationId" value={organisationId} />

              <Field label="Name">
                <Input name="name" required autoFocus />
              </Field>

              <Field label="Job title">
                <Input name="title" />
              </Field>

              <Field label="Email">
                <Input name="email" type="email" />
              </Field>

              <Field
                label="Mobile"
                hint="Pick the country, then type the local number. Stored in full international form so WhatsApp replies match."
              >
                <MobileInput />
              </Field>

              <label className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
                <input type="checkbox" name="isPrimary" />
                Primary contact for ticket replies
              </label>

              {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                  {pending ? 'Adding' : 'Add contact'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="secondary" className="mt-4" onClick={() => setOpen(true)}>
              Add contact
            </Button>
          )
        ) : null}
      </CardSection>
    </Card>
  );
}
