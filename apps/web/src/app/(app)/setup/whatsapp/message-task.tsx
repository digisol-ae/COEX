'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { DetailPopup } from '@/components/ui/detail-popup';
import { Button, Field, Input, Notice, Select } from '@/components/ui';
import { createChannelTaskAction } from './actions';

export function MessageTask({
  messageId,
  text,
  spaces,
}: {
  messageId: string;
  text: string | null;
  spaces: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createChannelTaskAction, {});
  return (
    <DetailPopup title="Create task from message" icon="add">
      {state.taskId ? (
        <Notice tone="ok">
          <Link className="underline" href={`/tasks/${state.taskId}`}>
            Open created task
          </Link>
        </Notice>
      ) : (
        <form action={action} className="space-y-3">
          <input type="hidden" name="messageId" value={messageId} />
          <Field label="Title">
            <Input
              name="title"
              required
              maxLength={240}
              defaultValue={text?.slice(0, 240) || 'WhatsApp follow-up'}
            />
          </Field>
          <Field label="Space">
            <Select name="spaceId" required defaultValue="">
              <option value="" disabled>
                Choose a space
              </option>
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Copies this message into an unassigned task. The original conversation stays unchanged.
          </p>
          {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating' : 'Create task'}
          </Button>
        </form>
      )}
    </DetailPopup>
  );
}
