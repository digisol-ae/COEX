'use client';
import { useActionState, useEffect, useState } from 'react';
import { DetailPopup } from '@/components/ui/detail-popup';
import { Button, Field, Select, Notice } from '@/components/ui';
import { setTicketCustomerAction } from '../../actions';
export function TicketCustomer({
  id,
  organisationId,
  contactId,
  customers,
}: {
  id: string;
  organisationId: string | null;
  contactId: string | null;
  customers: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(setTicketCustomerAction, {});
  const [customer, setCustomer] = useState(organisationId ?? '');
  const [contact, setContact] = useState(contactId ?? '');
  const [contacts, setContacts] = useState<{ id: string; name: string; email: string | null }[]>(
    [],
  );
  const [loading, setLoading] = useState(Boolean(organisationId));
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    if (!customer) return;
    fetch(`/api/crm/contacts?organisationId=${encodeURIComponent(customer)}`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d) => setContacts(d.contacts))
      .catch((e) => {
        if (e.name !== 'AbortError')
          setError('Could not load contacts. Choose the customer again.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [customer, reload]);
  return (
    <DetailPopup
      title="Edit customer and contact"
      icon="edit"
      onOpen={() => {
        setError('');
        setLoading(!!customer);
        setReload((value) => value + 1);
      }}
    >
      <form action={action} className="space-y-3">
        <input type="hidden" name="ticketId" value={id} />
        <Field label="Customer">
          <Select
            name="organisationId"
            value={customer}
            onChange={(e) => {
              setCustomer(e.target.value);
              setContact('');
              setContacts([]);
              setError('');
              setLoading(!!e.target.value);
            }}
          >
            <option value="">No customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Contact">
          <Select
            name="contactId"
            value={contact}
            disabled={!customer || loading}
            onChange={(e) => setContact(e.target.value)}
          >
            <option value="">{loading ? 'Loading contacts' : 'No contact'}</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.email ? ` · ${c.email}` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <p className="text-xs text-[var(--color-ink-muted)]">
          Changing the customer/contact changes who may see this ticket in the customer portal. The
          original sender remains in the conversation.
        </p>
        {error ? <Notice tone="alert">{error}</Notice> : null}
        {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
        {state.saved ? <Notice tone="ok">Saved.</Notice> : null}
        <Button type="submit" disabled={pending || loading || !!error}>
          {pending ? 'Saving' : 'Save'}
        </Button>
      </form>
    </DetailPopup>
  );
}
