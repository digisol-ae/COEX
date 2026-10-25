'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { Button, Field, Input, Notice } from '@/components/ui';
import { Captcha } from '@/components/ui/captcha';
import { activationAction, type ActivationState } from './actions';
export function ActivationForm() {
  const [state, action, pending] = useActionState(activationAction, {} as ActivationState);
  const step = state.step ?? 'request';
  if (step === 'done')
    return (
      <div className="mt-8 space-y-4">
        <Notice tone="ok">Your password is set. You can now sign in.</Notice>
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </div>
    );
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="step" value={step} />
      {step === 'request' ? (
        <>
          <Field label="Email address">
            <Input name="email" type="email" required autoComplete="email" />
          </Field>
          <Captcha action="activation" pending={pending} />
        </>
      ) : (
        <input type="hidden" name="email" value={state.email ?? ''} />
      )}
      {step === 'code' ? (
        <>
          <Notice>
            If an imported account is eligible, a code has been sent. It expires in 10 minutes. You
            can request another after 10 minutes.
          </Notice>
          <Field label="Email verification code">
            <Input
              name="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              required
            />
          </Field>
        </>
      ) : null}
      {step === 'password' ? (
        <>
          <input type="hidden" name="token" value={state.token ?? ''} />
          <Field label="New password">
            <Input
              name="password"
              type="password"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Field>
          <Field label="Confirm password">
            <Input
              name="confirm"
              type="password"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Field>
        </>
      ) : null}
      {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending
          ? 'Please wait'
          : step === 'request'
            ? 'Email me a code'
            : step === 'code'
              ? 'Verify code'
              : 'Set password'}
      </Button>
      <p className="text-center text-sm">
        <Link className="underline" href="/login">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
