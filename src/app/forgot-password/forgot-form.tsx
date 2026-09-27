'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Button, Field, Input, Notice } from '@/components/ui';
import { forgotPasswordAction, type ForgotState } from './actions';

const initialState: ForgotState = {};

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);

  if (state.sent) {
    return (
      <div className="mt-8 space-y-4">
        <Notice tone="ok">
          If that address has a COEX account, a link is on its way. It works once, for 30 minutes.
          Check your junk folder if it does not arrive in a few minutes.
        </Notice>
        <BackToSignIn />
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <Field label="Email address">
        <Input name="email" type="email" required autoComplete="email" autoFocus />
      </Field>
      <Button type="submit" disabled={pending} className="w-full py-2.5">
        {pending ? 'Sending' : 'Email me a link'}
      </Button>
      <BackToSignIn />
    </form>
  );
}

function BackToSignIn() {
  return (
    <p className="text-center text-sm">
      <Link
        href="/login"
        className="text-[var(--color-ink-muted)] underline-offset-4 hover:text-[var(--color-ink)] hover:underline"
      >
        Back to sign in
      </Link>
    </p>
  );
}
