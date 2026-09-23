'use client';

import { useActionState, useState } from 'react';
import { Button, Notice, Select } from '@/components/ui';
import { ROLES } from '@/modules/core/permissions';
import { changeRoleAction, resetPasswordAction, toggleStatusAction, type UserFormState } from './actions';

const initialState: UserFormState = {};

export function RoleSelect({ userId, role }: { userId: string; role: string }) {
  return (
    <form action={changeRoleAction}>
      <input type="hidden" name="userId" value={userId} />
      <Select
        name="role"
        defaultValue={role}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="max-w-40"
      >
        {ROLES.map((option) => (
          <option key={option} value={option}>
            {option.replace('_', ' ')}
          </option>
        ))}
      </Select>
    </form>
  );
}

export function StatusButton({ userId, status }: { userId: string; status: string }) {
  return (
    <form action={toggleStatusAction}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={status} />
      <Button variant={status === 'active' ? 'danger' : 'secondary'} type="submit">
        {status === 'active' ? 'Suspend' : 'Reactivate'}
      </Button>
    </form>
  );
}

/**
 * Resets to a fresh generated password and shows it once, the same way creating a user does.
 * `resetPasswordAction` already existed; only this trigger and the reveal were missing.
 */
export function ResetPasswordButton({ userId, email }: { userId: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Reset password
      </Button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Reset password"
    >
      <div className="w-full max-w-sm rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 text-left shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Reset password</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {state.createdPassword ? (
          <div className="space-y-3">
            <Notice tone="ok">Password reset for {state.createdEmail}.</Notice>
            <p className="text-xs text-[var(--color-ink-muted)]">
              Give this to them in person or by message. It is shown once.
            </p>
            <p className="rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] px-3 py-2 font-mono text-sm">
              {state.createdPassword}
            </p>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="email" value={email} />
            <p className="text-sm text-[var(--color-ink-muted)]">
              This immediately signs {email} out everywhere and replaces their password.
            </p>
            {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? 'Resetting' : 'Confirm reset'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
