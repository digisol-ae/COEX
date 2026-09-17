'use client';

import { useActionState, useState } from 'react';
import { Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import { ROLES } from '@/modules/core/permissions';
import { createUserAction, type UserFormState } from './actions';

const initialState: UserFormState = {};

/**
 * Adding a user generates a password and shows it once. Passwords are never emailed from here,
 * because email is the least private channel a company owns.
 */
export function CreateUserPanel() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createUserAction, initialState);

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Add user</Button>;
  }

  return (
    <Card className="w-96">
      <CardSection title="New user">
        {state.createdPassword ? (
          <div className="space-y-3">
            <Notice tone="ok">Account created for {state.createdEmail}.</Notice>
            <div>
              <p className="text-sm text-[var(--color-ink-muted)]">
                Give this password to them in person or by message. It is shown once.
              </p>
              <p className="mt-2 rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] px-3 py-2 font-mono text-sm">
                {state.createdPassword}
              </p>
            </div>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-3">
            <Field label="Full name">
              <Input name="name" required />
            </Field>

            <Field label="Email address">
              <Input name="email" type="email" required />
            </Field>

            <Field label="Job title" hint="Optional">
              <Input name="title" />
            </Field>

            <Field label="Role">
              <Select name="role" defaultValue="agent">
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role.replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </Field>

            {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={pending}>
                {pending ? 'Creating' : 'Create user'}
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
