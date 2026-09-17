'use client';

import { useActionState } from 'react';
import { Button, Field, Input, Notice, Select } from '@/components/ui';
import { archiveOrganisationAction, updateOrganisationAction, type CrmFormState } from '../actions';

const initialState: CrmFormState = {};

export function DetailsForm({
  organisation,
  editable,
}: {
  editable: boolean;
  organisation: {
    id: string;
    name: string;
    kind: string;
    industry: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    notes: string;
  };
}) {
  const [state, formAction, pending] = useActionState(updateOrganisationAction, initialState);

  if (!editable) {
    return (
      <dl className="space-y-3 text-sm">
        <Readonly label="Email" value={organisation.email} />
        <Readonly label="Phone" value={organisation.phone} />
        <Readonly label="Website" value={organisation.website} />
        <Readonly label="Address" value={organisation.address} />
      </dl>
    );
  }

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={organisation.id} />

        <Field label="Company name">
          <Input name="name" defaultValue={organisation.name} required />
        </Field>

        <Field label="Type">
          <Select name="kind" defaultValue={organisation.kind}>
            <option value="prospect">Prospect</option>
            <option value="client">Client</option>
            <option value="supplier">Supplier</option>
            <option value="partner">Partner</option>
          </Select>
        </Field>

        <Field label="Industry">
          <Input name="industry" defaultValue={organisation.industry} />
        </Field>

        <Field label="Email">
          <Input name="email" type="email" defaultValue={organisation.email} />
        </Field>

        <Field label="Phone">
          <Input name="phone" defaultValue={organisation.phone} />
        </Field>

        <Field label="Website">
          <Input name="website" defaultValue={organisation.website} />
        </Field>

        <Field label="Address">
          <Input name="address" defaultValue={organisation.address} />
        </Field>

        <Field label="Notes">
          <textarea
            name="notes"
            rows={3}
            defaultValue={organisation.notes}
            className="w-full rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
          />
        </Field>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving' : 'Save'}
          </Button>
          {state.saved ? <Notice tone="ok">Saved.</Notice> : null}
          {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
        </div>
      </form>

      <form action={archiveOrganisationAction} className="border-t border-[var(--color-line)] pt-4">
        <input type="hidden" name="id" value={organisation.id} />
        <Button variant="danger" type="submit">
          Archive customer
        </Button>
        <p className="mt-2 text-xs text-[var(--color-ink-subtle)]">
          Archiving hides the customer from lists. Nothing is deleted, so the history survives.
        </p>
      </form>
    </div>
  );
}

function Readonly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-[var(--color-ink-subtle)] uppercase">{label}</dt>
      <dd className="text-[var(--color-ink)]">{value || '—'}</dd>
    </div>
  );
}
