'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { Button, Field, Input, Notice } from '@/components/ui';
import { loginAction, type LoginState } from './actions';

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <Field label="Email address">
        <Input name="email" type="email" autoComplete="username" required />
      </Field>

      <Field label="Password">
        <div className="relative">
          <Input
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className="pr-9"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </Field>

      {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

      <Button type="submit" disabled={pending} className="w-full py-2.5">
        {pending ? 'Signing in' : 'Sign in'}
      </Button>
    </form>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 2l12 12M6.6 6.7A2.2 2.2 0 0 0 8 10.2c.5 0 1-.17 1.35-.45M4.2 4.5C2.6 5.6 1 8 1 8s2.5 5 7 5c1.2 0 2.25-.35 3.1-.85M9.9 5.15C9.35 5.05 8.7 5 8 5c-.4 0-.78.02-1.13.06M11.3 6.2c1.15.9 1.7 1.8 1.7 1.8s-.35.7-1 1.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
