'use client';
import { useActionState } from 'react';
import { Button, Field, Input, Notice } from '@/components/ui';
import { updatePortalProfile } from './actions';
export function PortalProfileForm({
  name,
  title,
  tenantId,
}: {
  name: string;
  title: string;
  tenantId: string;
}) {
  const [state, action, pending] = useActionState(updatePortalProfile, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="tenantId" value={tenantId} />
      <Field label="Name">
        <Input name="name" defaultValue={name} required maxLength={120} />
      </Field>
      <Field label="Job title">
        <Input name="title" defaultValue={title} maxLength={120} />
      </Field>
      {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
      {state.saved ? <Notice tone="ok">Saved.</Notice> : null}
      <Button disabled={pending} type="submit">
        {pending ? 'Saving' : 'Save'}
      </Button>
    </form>
  );
}
