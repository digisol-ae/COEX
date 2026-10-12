'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { clsx } from 'clsx';
import { Button, Field, Input, Notice } from '@/components/ui';
import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  passwordProblem,
  passwordStrength,
} from '@coex/shared/core/password-policy';
import { resetPasswordAction, type ResetState } from './actions';

const initialState: ResetState = {};

const LEVELS = ['', 'Too short', 'Fair', 'Strong', 'Very strong'];
const COLOURS = [
  'bg-[var(--color-line)]',
  'bg-[var(--color-status-alert)]',
  'bg-[var(--color-status-warn)]',
  'bg-[var(--color-status-ok)]',
  'bg-[var(--color-status-ok)]',
];

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);
  const [password, setPassword] = useState('');

  if (state.done) {
    return (
      <div className="mt-8 space-y-4">
        <Notice tone="ok">
          Your password is changed. Every device was signed out, so sign in again with the new one.
        </Notice>
        <Link
          href="/login"
          className="block rounded-[var(--radius-control)] bg-[var(--color-action)] py-2.5 text-center text-sm font-medium text-[var(--color-ink-inverse)]"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const strength = passwordStrength(password);
  // The server also checks the person's own name and email, which this page does not know.
  const problem = password ? passwordProblem(password) : null;

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="New password">
        <Input
          name="password"
          type="password"
          required
          minLength={PASSWORD_MIN}
          maxLength={PASSWORD_MAX}
          autoComplete="new-password"
          autoFocus
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </Field>

      <div aria-live="polite">
        <div className="flex gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className={clsx(
                'h-1.5 flex-1 rounded-full transition-colors',
                strength >= level ? COLOURS[strength] : 'bg-[var(--color-line)]',
              )}
            />
          ))}
        </div>
        <p className="mt-1.5 text-xs text-[var(--color-ink-subtle)]">
          {password ? (problem ?? LEVELS[strength]) : `At least ${PASSWORD_MIN} characters.`}
        </p>
      </div>

      <Field label="New password again">
        <Input
          name="confirm"
          type="password"
          required
          minLength={PASSWORD_MIN}
          maxLength={PASSWORD_MAX}
          autoComplete="new-password"
        />
      </Field>

      {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

      <Button type="submit" disabled={pending || Boolean(problem)} className="w-full py-2.5">
        {pending ? 'Saving' : 'Set new password'}
      </Button>
    </form>
  );
}
