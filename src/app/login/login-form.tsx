'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from './actions';

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-[var(--color-ink)]">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="w-full rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-[var(--color-ink)]">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] outline-none"
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-control)] bg-[var(--color-status-alert-soft)] px-3 py-2 text-sm text-[var(--color-status-alert)]"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-[var(--radius-control)] bg-[var(--color-action)] px-4 py-2.5 font-medium text-[var(--color-ink-inverse)] transition-colors hover:bg-[var(--color-action-hover)] disabled:opacity-60"
      >
        {pending ? 'Signing in' : 'Sign in'}
      </button>
    </form>
  );
}
