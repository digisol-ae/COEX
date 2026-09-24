'use client';

import { useActionState, useState } from 'react';
import { Button, Notice, Select } from '@/components/ui';
import { ROLES } from '@/modules/core/permissions';
import {
  changeRoleAction,
  resetPasswordAction,
  toggleStatusAction,
  updateUserAccessAction,
  type UserFormState,
} from './actions';
import { PERMISSION_GROUPS } from '@/modules/core/permission-labels';
import { permissionsFor, type Permission, type Role } from '@/modules/core/permissions';

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

type Choice = 'default' | 'allow' | 'deny';

/**
 * Per-user access, on top of the role.
 *
 * "Default" leaves the permission exactly as the role sets it, shown here so an admin can see
 * what that actually means without opening the role table separately. "Always allow" and "Always
 * deny" are the override, and a denial wins if a permission is somehow both: this is how one
 * person can see only CRM and Products, nothing else but their own password reset, without a
 * role built for a single person.
 */
export function AccessEditor({
  userId,
  role,
  grants,
  denials,
}: {
  userId: string;
  role: Role;
  grants: string[];
  denials: string[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(updateUserAccessAction, initialState);

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Manage access
      </Button>
    );
  }

  const roleGrants = permissionsFor({ role });

  function choiceFor(permission: Permission): Choice {
    if (grants.includes(permission)) return 'allow';
    if (denials.includes(permission)) return 'deny';
    return 'default';
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Manage access"
    >
      <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-5 text-left shadow-xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Manage access</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-xs text-[var(--color-ink-muted)]">
          Role: <span className="font-medium">{role.replace('_', ' ')}</span>. "Default" follows
          the role below; overriding one permission does not touch any other.
        </p>

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="userId" value={userId} />

          {PERMISSION_GROUPS.map((group) => (
            <fieldset key={group.label} className="space-y-2">
              <legend className="text-[11px] font-medium tracking-wide text-[var(--color-ink-subtle)] uppercase">
                {group.label}
              </legend>

              {group.permissions.map((permission) => (
                <div
                  key={permission.id}
                  className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] py-1.5 last:border-0"
                >
                  <span className="text-sm text-[var(--color-ink)]">{permission.label}</span>

                  <div className="flex shrink-0 gap-1 text-xs">
                    {(['default', 'allow', 'deny'] as Choice[]).map((choice) => (
                      <label
                        key={choice}
                        className="flex cursor-pointer items-center gap-1 rounded-[var(--radius-control)] border border-[var(--color-line)] px-2 py-0.5 has-checked:border-[var(--color-ink)] has-checked:bg-[var(--color-surface-muted)]"
                      >
                        <input
                          type="radio"
                          name={`perm_${permission.id}`}
                          value={choice}
                          defaultChecked={choiceFor(permission.id) === choice}
                          className="sr-only"
                        />
                        {choice === 'default'
                          ? `Default (${roleGrants.has(permission.id) ? 'on' : 'off'})`
                          : choice === 'allow'
                            ? 'Always on'
                            : 'Always off'}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </fieldset>
          ))}

          {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
          {state.message ? <Notice tone="ok">{state.message}</Notice> : null}

          <div className="flex gap-2 border-t border-[var(--color-line)] pt-4">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving' : 'Save access'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
