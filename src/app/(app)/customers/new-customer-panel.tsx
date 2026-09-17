'use client';

import { useActionState, useState } from 'react';
import { Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import { createOrganisationAction, type CrmFormState } from './actions';

const initialState: CrmFormState = {};

export function NewCustomerPanel() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createOrganisationAction, initialState);

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Add customer</Button>;
  }

  return (
    <Card className="w-96">
      <CardSection title="New customer">
        <form action={formAction} className="space-y-3">
          <Field label="Company name">
            <Input name="name" required autoFocus />
          </Field>

          <Field label="Type">
            <Select name="kind" defaultValue="prospect">
              <option value="prospect">Prospect</option>
              <option value="client">Client</option>
              <option value="supplier">Supplier</option>
              <option value="partner">Partner</option>
            </Select>
          </Field>

          <Field label="Industry" hint="Optional, for example Dental or Polyclinic">
            <Input name="industry" />
          </Field>

          <Field label="Main email">
            <Input name="email" type="email" />
          </Field>

          <Field label="Main phone">
            <Input name="phone" />
          </Field>

          {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating' : 'Create customer'}
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
