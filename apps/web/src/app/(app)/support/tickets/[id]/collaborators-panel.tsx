'use client';

import { useActionState, useState } from 'react';
import { Button, Notice } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import type { CollaboratorOption } from '@coex/shared/tickets/collaborators';
import { saveCollaboratorsAction, type SupportFormState } from '../../actions';
import { CollaboratorPicker } from '../collaborator-picker';

/**
 * Who is copied on public replies, kept inside the reply box (John's team, 18 Oct 2026) rather than
 * in a card of its own: a quiet "Cc" line with the people already copied, and an edit icon that
 * opens the picker. It is its own form, so it sits above the reply form and never inside it.
 */
export function CollaboratorsInline({
  ticketId,
  emails,
  options,
}: {
  ticketId: string;
  emails: string[];
  options: CollaboratorOption[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    async (previous: SupportFormState, formData: FormData) => {
      const result = await saveCollaboratorsAction(previous, formData);
      if (!result.error) setOpen(false);
      return result;
    },
    {} as SupportFormState,
  );

  return (
    <div className="mt-3 rounded-[var(--radius-control)] border border-[var(--color-line)] px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
        <span className="font-medium">Cc</span>
        <span className="min-w-0 flex-1 truncate">
          {emails.length > 0
            ? emails.join(', ')
            : 'Nobody copied. Public replies go to the customer only.'}
        </span>
        <IconButton
          icon="edit"
          label={open ? 'Close the Cc list' : 'Change who is copied on public replies'}
          onClick={() => setOpen((value) => !value)}
        />
      </div>

      {open ? (
        <form action={action} className="mt-2 space-y-2">
          <input type="hidden" name="ticketId" value={ticketId} />
          <CollaboratorPicker
            key={JSON.stringify(emails)}
            initialEmails={emails}
            options={options}
            disabled={pending}
          />
          {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? 'Saving' : 'Save Cc'}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
