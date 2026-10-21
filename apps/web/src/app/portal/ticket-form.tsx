'use client';
import { Captcha } from '@/components/ui/captcha';
import { useActionState, useEffect, useRef } from 'react';
import { Button, Field, Input, Notice, Textarea } from '@/components/ui';
import { TicketAttachmentPicker } from '@/components/ui/ticket-attachment-picker';
import { raiseAction, replyAction } from './actions';
export function PortalTicketForm({ ticketId }: { ticketId?: string }) {
  const [state, action, pending] = useActionState(ticketId ? replyAction : raiseAction, {});
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.saved) form.current?.reset();
  }, [state]);
  return (
    <form ref={form} action={action} className="space-y-3">
      {ticketId ? (
        <input type="hidden" name="ticketId" value={ticketId} />
      ) : (
        <Field label="Subject">
          <Input name="subject" required maxLength={200} disabled={pending} />
        </Field>
      )}
      <Field label={ticketId ? 'Your reply' : 'How can we help?'}>
        <Textarea name="body" rows={5} required maxLength={20000} disabled={pending} />
      </Field>
      <TicketAttachmentPicker disabled={pending} />
      <Captcha action={ticketId ? 'portal_reply' : 'portal_ticket'} pending={pending} />
      {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
      {state.warning ? (
        <Notice tone="warn">{state.warning}</Notice>
      ) : state.saved ? (
        <Notice tone="ok">Reply sent.</Notice>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? 'Sending' : ticketId ? 'Send reply' : 'Raise ticket'}
      </Button>
    </form>
  );
}
