'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { Button, Field, Input, Notice } from '@/components/ui';
import { Captcha } from '@/components/ui/captcha';
import {
  applyAction,
  verifyEmailAction,
  activateAdministratorAction,
  resendActivationAction,
} from './actions';

export function ApplicationForm() {
  const [state, action, pending] = useActionState(applyAction, {});
  if (state.done)
    return (
      <div className="mt-7 space-y-4">
        <Notice tone="ok">
          Check your email. If this address can apply, we’ve sent a verification link. Your trial
          begins only after approval.
        </Notice>
        <p className="text-sm">
          Already applied? A verified application remains in review. Existing users can{' '}
          <Link href="/login?view=staff" className="underline">
            log in
          </Link>
          .
        </p>
      </div>
    );
  return (
    <form action={action} className="mt-7 space-y-4">
      <Field label="Company name">
        <Input name="companyName" required maxLength={200} autoComplete="organization" />
      </Field>
      <Field
        label="Workspace identifier"
        hint="Lower-case letters, numbers and single hyphens, for example acme-dental."
      >
        <Input
          name="slug"
          required
          minLength={2}
          maxLength={40}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          autoCapitalize="none"
          autoComplete="off"
        />
      </Field>
      <Field label="Your name">
        <Input name="adminName" required maxLength={200} autoComplete="name" />
      </Field>
      <Field label="Work email">
        <Input name="email" type="email" required maxLength={254} autoComplete="email" />
      </Field>
      <div className="hidden" aria-hidden="true">
        <label>
          Website
          <Input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="text-sm text-[var(--color-ink-muted)]">
        We’ll verify your email and review your application. Once approved, you’ll become your
        company’s administrator and receive a link to choose your password.
      </p>
      <Captcha action="register" pending={pending} />
      {state.error && <Notice tone="alert">{state.error}</Notice>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Submitting…' : 'Submit application'}
      </Button>
      <p className="text-sm">
        <Link href="/login?view=staff" className="underline">
          Already registered? Log in
        </Link>
      </p>
    </form>
  );
}

export function VerifyApplicationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(verifyEmailAction, {});
  return (
    <div className="mt-7 space-y-4">
      {state.done ? (
        <Notice tone="ok">
          Email verified. Your application is awaiting approval. We’ll email you when it has been
          reviewed. No trial time is used while you wait.
        </Notice>
      ) : (
        <form action={action} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          {state.error && <Notice tone="alert">{state.error}</Notice>}
          <Button type="submit" disabled={pending}>
            Verify my email
          </Button>
        </form>
      )}
      <Link href="/" className="text-sm underline">
        Back to Worktello
      </Link>
    </div>
  );
}

export function TrialActivationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(activateAdministratorAction, {});
  if (state.done)
    return (
      <div className="mt-7 space-y-4">
        <Notice tone="ok">Your administrator account is ready.</Notice>
        <Link href="/login?view=staff" className="font-medium underline">
          Log in to your workspace
        </Link>
      </div>
    );
  return (
    <form action={action} className="mt-7 space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field
        label="Password"
        hint="At least 12 characters. Use a few unrelated words; leave out your name and email."
      >
        <Input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
        />
      </Field>
      <Field label="Confirm password">
        <Input
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
        />
      </Field>
      {state.error && <Notice tone="alert">{state.error}</Notice>}
      <Button type="submit" disabled={pending}>
        Activate administrator account
      </Button>
    </form>
  );
}

export function ResendTrialActivation() {
  const [state, action, pending] = useActionState(resendActivationAction, {});
  return (
    <form action={action} className="mt-7 space-y-4">
      <Field label="Approved administrator email">
        <Input name="email" type="email" autoComplete="email" maxLength={254} required />
      </Field>
      <Captcha action="trial_activation" pending={pending} />
      {state.done && (
        <Notice tone="ok">
          If this address has an approved account awaiting activation, a new link is on its way.
        </Notice>
      )}
      {state.error && <Notice tone="alert">{state.error}</Notice>}
      <Button type="submit" disabled={pending}>
        Request a new activation link
      </Button>
    </form>
  );
}
