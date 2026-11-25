'use client';
import { useActionState } from 'react';
import { Button, Notice } from '@/components/ui';
import { provisionPortalAction } from '../actions';
export function PortalAccess({ contactId, linked }: { contactId: string; linked: boolean }) {
  const [state, action, pending] = useActionState(provisionPortalAction, {});
  return (
    <div className="mt-2 text-xs">
      {linked || state.activationUrl ? (
        <span className="text-[var(--color-status-ok)]">Portal account linked</span>
      ) : (
        <form action={action}>
          <input type="hidden" name="contactId" value={contactId} />
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? 'Creating' : 'Create portal account'}
          </Button>
        </form>
      )}
      {state.activationUrl ? (
        <Notice tone={state.emailQueued ? 'ok' : 'warn'}>
          {state.emailQueued
            ? 'Invitation email queued.'
            : 'Email could not be queued. Share this company-specific activation page with the contact:'}
          <a href={state.activationUrl} className="mt-1 block break-all underline">
            {state.activationUrl}
          </a>
          The contact verifies their own email and chooses a password. No temporary password is
          shared.
        </Notice>
      ) : null}
      {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
    </div>
  );
}
