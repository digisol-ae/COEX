'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Button, Card, CardSection, Field, Input, Notice } from '@/components/ui';
import { changePasswordAction, updateProfileAction, type ProfileFormState } from './actions';

const initialState: ProfileFormState = {};

export function ProfileForm({ name, title }: { name: string; title: string }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);

  return (
    <Card>
      <CardSection title="Details">
        <form action={formAction} className="space-y-3">
          <Field label="Name">
            <Input name="name" required maxLength={120} defaultValue={name} autoComplete="name" />
          </Field>
          <Field label="Job title" hint="Optional. Shown to colleagues beside your name.">
            <Input name="title" maxLength={120} defaultValue={title} />
          </Field>
          {state.error ? <Notice tone="warn">{state.error}</Notice> : null}
          {state.saved ? <Notice tone="ok">Saved.</Notice> : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save details'}
            </Button>
          </div>
        </form>
      </CardSection>
    </Card>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.saved) form.current?.reset();
  }, [state.saved]);

  return (
    <Card>
      <CardSection title="Password">
        <form ref={form} action={formAction} className="space-y-3">
          <Field label="Current password">
            <Input name="current" type="password" required autoComplete="current-password" />
          </Field>
          <Field label="New password" hint="At least 10 characters.">
            <Input
              name="next"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
            />
          </Field>
          <Field label="New password again">
            <Input
              name="confirm"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
            />
          </Field>
          {state.error ? <Notice tone="warn">{state.error}</Notice> : null}
          {state.saved ? (
            <Notice tone="ok">
              Password changed. Your other devices will need to sign in again.
            </Notice>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? 'Changing…' : 'Change password'}
            </Button>
          </div>
        </form>
      </CardSection>
    </Card>
  );
}
