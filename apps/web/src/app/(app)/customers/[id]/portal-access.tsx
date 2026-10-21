'use client';
import { useActionState } from 'react';
import { Button, Notice } from '@/components/ui';
import { provisionPortalAction } from '../actions';
export function PortalAccess({ contactId, linked }: { contactId: string; linked: boolean }) {
  const [state, action, pending] = useActionState(provisionPortalAction, {});
  return (
    <div className="mt-2 text-xs">
      {linked || state.password ? (
        <span className="text-[var(--color-status-ok)]">Portal account linked</span>
      ) : (
        <form action={action}>
          <input type="hidden" name="contactId" value={contactId} />
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? 'Creating' : 'Create portal account'}
          </Button>
        </form>
      )}
      {state.password ? (
        <Notice tone="info">
          <p>
            Temporary password: <code className="select-all font-mono">{state.password}</code>
          </p>
          <p>Share it securely with this contact. It is shown only here. Portal: /portal</p>
        </Notice>
      ) : null}
      {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
    </div>
  );
}
