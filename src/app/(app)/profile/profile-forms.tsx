'use client';

import { useActionState, useState, useTransition } from 'react';
import { Button, Card, CardSection, Field, Input, Notice } from '@/components/ui';
import { emailPasswordLinkAction, updateProfileAction, type ProfileFormState } from './actions';

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

export function PasswordLink({ email }: { email: string }) {
  const [state, setState] = useState<ProfileFormState>({});
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardSection title="Password">
        <div className="space-y-3">
          <p className="text-sm text-[var(--color-ink-muted)]">
            We email a link to <span className="font-medium text-[var(--color-ink)]">{email}</span>.
            It works once, for 30 minutes. After you choose a new password, every device signs in
            again.
          </p>
          {state.error ? <Notice tone="warn">{state.error}</Notice> : null}
          {state.saved ? (
            <Notice tone="ok">
              Link sent. Check your inbox, and your junk folder if it is not there.
            </Notice>
          ) : null}
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={pending}
              onClick={() => startTransition(async () => setState(await emailPasswordLinkAction()))}
            >
              {pending ? 'Sending…' : 'Email me a link to change my password'}
            </Button>
          </div>
        </div>
      </CardSection>
    </Card>
  );
}
