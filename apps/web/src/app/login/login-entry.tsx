'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthShell } from './auth-shell';
import { LoginForm } from './login-form';

export function LoginEntry({
  entraEnabled,
  entraError,
}: {
  entraEnabled: boolean;
  entraError?: string;
}) {
  const [mode, setMode] = useState<'customer' | 'agent'>(entraError ? 'agent' : 'customer');
  const customer = mode === 'customer';
  return (
    <AuthShell
      title={customer ? 'Create / View Your Support Ticket' : 'Sign in to Worktello'}
      intro={
        customer
          ? 'Raise a request, follow its progress and talk to our support team.'
          : 'Access your tasks, customers and support workspace.'
      }
      beforeTitle={
        <div
          role="group"
          aria-label="Sign-in view"
          className="mb-6 grid grid-cols-2 gap-1 rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface-muted)] p-1.5"
        >
          {(['customer', 'agent'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={mode === value}
              onClick={() => setMode(value)}
              className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${mode === value ? 'bg-[var(--color-action)] text-[var(--color-ink-inverse)] shadow-sm' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'}`}
            >
              {value === 'customer' ? 'Customer' : 'Agent'}
            </button>
          ))}
        </div>
      }
    >
      <LoginForm entraEnabled={entraEnabled && !customer} entraError={entraError} />
      {customer ? (
        <p className="mt-4 text-center text-sm text-[var(--color-ink-muted)]">
          <Link href="/activate" className="font-semibold underline">
            First time here? Activate your account
          </Link>
        </p>
      ) : null}
    </AuthShell>
  );
}
