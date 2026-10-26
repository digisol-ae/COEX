'use client';
import Link from 'next/link';
import { useActionState, useState } from 'react';
import { Button, Field, Input, Notice } from '@/components/ui';
import { Captcha } from '@/components/ui/captcha';
import { emailLoginAction, type EmailLoginState } from './actions';
export function EmailLoginForm() {
  const [revision, setRevision] = useState(0);
  return <EmailLoginSteps key={revision} onRestart={() => setRevision((value) => value + 1)} />;
}
function EmailLoginSteps({ onRestart }: { onRestart: () => void }) {
  const [state, action, pending] = useActionState(emailLoginAction, {} as EmailLoginState);
  const step = state.step ?? 'request';
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="step" value={step} />
      {step === 'request' ? (
        <>
          <Field label="Registered email address">
            <Input name="email" type="email" maxLength={254} required autoComplete="email" />
          </Field>
          <Captcha action="email_login" pending={pending} />
        </>
      ) : (
        <>
          <input type="hidden" name="email" value={state.email ?? ''} />
          <Notice>
            If this email has an eligible customer account, a code is on its way. It works once, for
            10 minutes. Check your junk folder. Another code can be requested after 10 minutes.
          </Notice>
          <Field label="Email sign-in code">
            <Input
              name="code"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              autoComplete="one-time-code"
              required
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="rememberMe" className="h-4 w-4" />
            Remember me on this PC for 60 days
          </label>
        </>
      )}
      {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending
          ? 'Please wait'
          : step === 'request'
            ? 'Email me a sign-in code'
            : 'Verify code and sign in'}
      </Button>
      {step === 'code' ? (
        <p className="text-center text-sm">
          <button type="button" onClick={onRestart} className="underline">
            Request another code or use a different email
          </button>
        </p>
      ) : null}
      <p className="text-center text-sm">
        <Link href="/login" className="underline">
          Sign in with a password
        </Link>
      </p>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="underline">
          Forgot password? Set a new password
        </Link>
      </p>
    </form>
  );
}
