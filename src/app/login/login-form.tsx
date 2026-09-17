'use client';

import { useActionState } from 'react';
import { Button, Field, Input, Notice } from '@/components/ui';
import { loginAction, type LoginState } from './actions';

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <Field label="Email address">
        <Input name="email" type="email" autoComplete="username" required />
      </Field>

      <Field label="Password">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>

      {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

      <Button type="submit" disabled={pending} className="w-full py-2.5">
        {pending ? 'Signing in' : 'Sign in'}
      </Button>
    </form>
  );
}
