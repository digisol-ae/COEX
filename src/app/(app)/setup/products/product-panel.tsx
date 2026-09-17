'use client';

import { useActionState, useState } from 'react';
import { Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import { saveProductAction, type ProductFormState } from './actions';

const initialState: ProductFormState = {};

export function ProductPanel() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(saveProductAction, initialState);

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Add product</Button>;
  }

  return (
    <Card className="w-96">
      <CardSection title="New product">
        <form action={formAction} className="space-y-3">
          <Field label="Name">
            <Input name="name" required autoFocus placeholder="R4+ Practice Management" />
          </Field>

          <Field label="Code" hint="Short and permanent, for example R4PLUS">
            <Input name="code" required />
          </Field>

          <Field label="Type">
            <Select name="kind" defaultValue="software">
              <option value="software">Software</option>
              <option value="module">Module</option>
              <option value="service">Service</option>
              <option value="hardware">Hardware</option>
              <option value="support">Support</option>
            </Select>
          </Field>

          <Field label="Description">
            <Input name="description" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="List price" hint="Leave empty if it varies">
              <Input name="price" inputMode="decimal" placeholder="1499.00" />
            </Field>

            <Field label="Currency">
              <Select name="currency" defaultValue="AED">
                <option>AED</option>
                <option>PKR</option>
                <option>USD</option>
                <option>SAR</option>
              </Select>
            </Field>
          </div>

          <Field label="Billing">
            <Select name="billingPeriod" defaultValue="once">
              <option value="once">One off</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </Field>

          {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
          {state.saved ? <Notice tone="ok">Saved.</Notice> : null}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving' : 'Add product'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </form>
      </CardSection>
    </Card>
  );
}
