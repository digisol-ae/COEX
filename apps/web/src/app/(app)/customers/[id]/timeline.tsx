'use client';

import { useActionState, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardSection,
  EmptyState,
  Field,
  Input,
  Notice,
  Select,
} from '@/components/ui';
import type { TimelineEntry } from '@/modules/crm/services/activity.service';
import { logActivityAction, type CrmFormState } from '../actions';

const initialState: CrmFormState = {};

/**
 * One timeline for everything that has ever happened with this customer. Entries written by
 * Tickets, Tasks and XVERSE appear here beside notes typed by hand, which is the point of keeping
 * a single activity collection.
 */

const KIND_LABEL: Record<string, string> = {
  note: 'Note',
  call: 'Call',
  meeting: 'Meeting',
  email: 'Email',
  whatsapp: 'WhatsApp',
  ticket_opened: 'Ticket opened',
  ticket_replied: 'Ticket reply',
  ticket_resolved: 'Ticket resolved',
  task_created: 'Task created',
  task_completed: 'Task completed',
  document_shared: 'Document shared',
};

export function Timeline({
  organisationId,
  entries,
  canWrite,
}: {
  organisationId: string;
  entries: TimelineEntry[];
  canWrite: boolean;
}) {
  const [state, formAction, pending] = useActionState(logActivityAction, initialState);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Card>
      {canWrite ? (
        <CardSection title="Log an interaction">
          <form action={formAction} className="space-y-3" key={state.saved ? 'saved' : 'editing'}>
            <div className="flex gap-3">
              <input type="hidden" name="organisationId" value={organisationId} />

              <Select name="kind" defaultValue="note" className="max-w-36">
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="meeting">Meeting</option>
                <option value="email">Email</option>
              </Select>

              <Input name="summary" placeholder="What happened" required className="flex-1" />

              <Button type="submit" disabled={pending}>
                {pending ? 'Adding' : 'Add'}
              </Button>
            </div>

            <Field label="Detail" hint="Optional. Anything the next person needs to know.">
              <textarea
                name="body"
                rows={2}
                className="w-full rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
              />
            </Field>

            {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
          </form>
        </CardSection>
      ) : null}

      <CardSection title={`Timeline · ${entries.length} entries`}>
        {entries.length === 0 ? (
          <EmptyState message="Nothing recorded yet. Notes, calls, tickets and tasks all appear here." />
        ) : (
          <ol className="space-y-4">
            {entries.map((entry) => (
              <li key={entry.id} className="border-l-2 border-[var(--color-line)] pl-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={entry.sourceModule === 'crm' ? 'neutral' : 'info'}>
                    {KIND_LABEL[entry.kind] ?? entry.kind}
                  </Badge>
                  <span className="text-sm font-medium text-[var(--color-ink)]">
                    {entry.summary}
                  </span>
                </div>

                <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                  {new Date(entry.occurredAt).toLocaleString('en-GB')} · {entry.actorName}
                </p>

                {entry.body ? (
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                    className="mt-1 text-xs text-[var(--color-ink-muted)] underline-offset-4 hover:underline"
                  >
                    {expanded === entry.id ? 'Hide detail' : 'Show detail'}
                  </button>
                ) : null}

                {expanded === entry.id && entry.body ? (
                  <p className="mt-2 rounded-[var(--radius-control)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm whitespace-pre-wrap text-[var(--color-ink-muted)]">
                    {entry.body}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </CardSection>
    </Card>
  );
}
