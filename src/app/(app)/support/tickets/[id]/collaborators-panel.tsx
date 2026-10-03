'use client';

import { useActionState } from 'react';
import { Button, Card, CardSection, Notice } from '@/components/ui';
import type { CollaboratorOption } from '@/modules/tickets/collaborators';
import { saveCollaboratorsAction, type SupportFormState } from '../../actions';
import { CollaboratorPicker } from '../collaborator-picker';

export function CollaboratorsPanel({
  ticketId,
  emails,
  options,
}: {
  ticketId: string;
  emails: string[];
  options: CollaboratorOption[];
}) {
  const [state, action, pending] = useActionState(saveCollaboratorsAction, {} as SupportFormState);
  return (
    <Card>
      <CardSection>
        <form action={action} className="space-y-2">
          <input type="hidden" name="ticketId" value={ticketId} />
          <CollaboratorPicker
            key={JSON.stringify(emails)}
            initialEmails={emails}
            options={options}
            disabled={pending}
          />
          {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
          {state.saved ? <Notice>CC collaborators saved.</Notice> : null}
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving' : 'Save CC collaborators'}
          </Button>
        </form>
      </CardSection>
    </Card>
  );
}
