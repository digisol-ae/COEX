'use client';

import { useActionState, useState } from 'react';
import { Button, Card, CardSection, Field, Input, Notice } from '@/components/ui';
import { createTenantAction, type TenantCreateState } from './actions';

const initialState: TenantCreateState = {};

export function CreateTenantPanel() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createTenantAction, initialState);

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Add tenant</Button>;
  }

  return (
    <Card className="w-full sm:w-96">
      <CardSection title="New tenant">
        {state.password ? (
          <div className="space-y-3">
            <Notice tone="ok">Tenant created with its first administrator.</Notice>
            <p className="text-sm text-[var(--color-ink-muted)]">
              Sign in details for {state.email}. The password is shown once.
            </p>
            <p className="rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] px-3 py-2 font-mono text-sm">
              {state.password}
            </p>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-3">
            <Field label="Company name">
              <Input name="name" required />
            </Field>

            <Field
              label="Identifier"
              hint="Lower case letters, numbers and hyphens, for example cibo"
            >
              <Input name="slug" required pattern="[a-z0-9-]{2,40}" />
            </Field>

            <Field label="Administrator name">
              <Input name="adminName" required />
            </Field>

            <Field label="Administrator email">
              <Input name="adminEmail" type="email" required />
            </Field>

            {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={pending}>
                {pending ? 'Creating' : 'Create tenant'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardSection>
    </Card>
  );
}
