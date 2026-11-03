'use client';

import { RecordList } from '@/components/ui/record-window';
import { DetailPopup } from '@/components/ui/detail-popup';
import { PortalAccess } from './portal-access';
import { TicketPeoplePicker } from './ticket-people-picker';
import { useActionState, useState } from 'react';
import { Button, Card, CardSection, EmptyState, Field, Input, Notice } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import type { ContactSummary } from '@/modules/crm/services/contact.service';
import { MobileInput } from '@/modules/crm/components/mobile-input';
import {
  addContactAction,
  archiveContactAction,
  updateContactAction,
  type CrmFormState,
} from '../actions';

const initialState: CrmFormState = {};

export function ContactsPanel({
  organisationId,
  contacts,
  canWrite,
  canManagePortal = false,
  canSearchTickets = false,
}: {
  organisationId: string;
  contacts: ContactSummary[];
  canWrite: boolean;
  canManagePortal?: boolean;
  canSearchTickets?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [finding, setFinding] = useState(false);
  const [state, formAction, pending] = useActionState(addContactAction, initialState);

  return (
    <Card>
      <CardSection title={`Contacts · ${contacts.length}`}>
        {contacts.length === 0 ? (
          <EmptyState message="No contacts yet." />
        ) : (
          <RecordList as="ul" className="space-y-3">
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
                  {canManagePortal && contact.email ? (
                    <PortalAccess contactId={contact.id} linked={contact.portalLinked ?? false} />
                  ) : null}
                  {contact.mobile ? (
                    <p className="text-xs text-[var(--color-ink-muted)]">{contact.mobile}</p>
                  ) : null}
                </div>

                {canWrite ? (
                  <div className="flex items-center gap-1">
                    <DetailPopup title="Edit contact" icon="edit">
                      <ContactEdit contact={contact} organisationId={organisationId} />
                    </DetailPopup>
                    <form action={archiveContactAction}>
                      <input type="hidden" name="id" value={contact.id} />
                      <input type="hidden" name="organisationId" value={organisationId} />
                      <IconButton
                        type="submit"
                        icon="remove"
                        label="Remove this contact"
                        tone="danger"
                      />
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </RecordList>
        )}

        {canWrite ? (
          open ? (
            <form
              action={formAction}
              className="mt-4 space-y-3 border-t border-[var(--color-line)] pt-4"
            >
              <input type="hidden" name="organisationId" value={organisationId} />

              {canSearchTickets ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setOpen(false);
                    setFinding(true);
                  }}
                >
                  Find from tickets
                </Button>
              ) : null}

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
          ) : finding ? (
            <TicketPeoplePicker organisationId={organisationId} onClose={() => setFinding(false)} />
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setOpen(true)}>
                Add contact
              </Button>
              {canSearchTickets ? (
                <Button variant="secondary" onClick={() => setFinding(true)}>
                  Find from tickets
                </Button>
              ) : null}
            </div>
          )
        ) : null}
      </CardSection>
    </Card>
  );
}

function ContactEdit({
  contact,
  organisationId,
}: {
  contact: ContactSummary;
  organisationId: string;
}) {
  const [state, action, pending] = useActionState(updateContactAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={contact.id} />
      <input type="hidden" name="organisationId" value={organisationId} />
      <Field label="Name">
        <Input name="name" required maxLength={120} defaultValue={contact.name} />
      </Field>
      <Field label="Job title">
        <Input name="title" defaultValue={contact.title ?? ''} />
      </Field>
      <Field
        label="Email"
        hint={
          contact.portalLinked
            ? 'Portal login email is managed through account administration.'
            : undefined
        }
      >
        <Input
          name="email"
          type="email"
          readOnly={contact.portalLinked}
          defaultValue={contact.email ?? ''}
        />
      </Field>
      <Field label="Mobile">
        <MobileInput defaultValue={contact.mobile ?? ''} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isPrimary" defaultChecked={contact.isPrimary} />
        Primary contact for ticket replies
      </label>
      {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
      {state.saved ? <Notice tone="ok">Saved.</Notice> : null}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving' : 'Save'}
      </Button>
    </form>
  );
}
