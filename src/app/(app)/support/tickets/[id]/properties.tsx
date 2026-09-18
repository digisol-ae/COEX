'use client';

import Link from 'next/link';
import { useActionState, useState, useTransition } from 'react';
import { Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import { TicketPicker } from './ticket-picker';
import { STATUS_LABELS } from '@/modules/tickets/labels';
import type { Priority, TicketStatus } from '@/modules/tickets/services/ticket.service';
import {
  assignAction,
  escalateAction,
  linkAction,
  mergeAction,
  moveQueueAction,
  setPriorityAction,
  setStatusAction,
  unlinkAction,
  type SupportFormState,
} from '../../actions';

const initialState: SupportFormState = {};

interface TicketProperties {
  id: string;
  status: TicketStatus;
  priority: Priority;
  queueId: string;
  assigneeId: string | null;
  escalatedTaskId: string | null;
  escalatedTaskNumber: string | null;
  linkedTickets: { id: string; number: string; subject: string; status: string }[];
  isOpen: boolean;
  isMerged: boolean;
  firstRespondedAt: Date | null;
  resolvedAt: Date | null;
}

/**
 * Everything about the ticket that is not the conversation.
 *
 * Each control saves on change rather than collecting into a form with a Save button, because an
 * agent changing an owner mid conversation should not have to remember a second step. The status
 * list only offers moves the service actually allows, so a refusal is something you cannot reach
 * rather than an error you have to read.
 */
export function Properties({
  ticket,
  queues,
  users,
  spaces,
  canManage,
}: {
  ticket: TicketProperties;
  queues: { id: string; name: string }[];
  users: { id: string; name: string }[];
  spaces: { id: string; name: string }[];
  canManage: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(work: () => Promise<SupportFormState>) {
    setError(null);

    startTransition(async () => {
      const result = await work();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      {error ? <Notice tone="alert">{error}</Notice> : null}

      <Card>
        <CardSection title="Ticket">
          <div className="space-y-3">
            <Field label="Status">
              <Select
                value={ticket.status}
                disabled={!canManage || ticket.isMerged}
                onChange={(event) =>
                  run(() =>
                    setStatusAction({
                      id: ticket.id,
                      status: event.target.value as TicketStatus,
                    }),
                  )
                }
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Owner">
              <Select
                value={ticket.assigneeId ?? ''}
                disabled={!canManage || ticket.isMerged}
                onChange={(event) =>
                  run(() => assignAction({ id: ticket.id, userId: event.target.value || null }))
                }
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Priority"
              hint={
                ticket.firstRespondedAt
                  ? 'The first reply clock has already stopped, so only the resolution target moves.'
                  : 'Changing this recalculates both targets from when the ticket arrived.'
              }
            >
              <Select
                value={ticket.priority}
                disabled={!canManage || ticket.isMerged}
                onChange={(event) =>
                  run(() =>
                    setPriorityAction({ id: ticket.id, priority: event.target.value as Priority }),
                  )
                }
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </Select>
            </Field>

            <Field
              label="Queue"
              hint="The queue owns the targets, so moving one recalculates them."
            >
              <Select
                value={ticket.queueId}
                disabled={!canManage || ticket.isMerged}
                onChange={(event) =>
                  run(() => moveQueueAction({ id: ticket.id, queueId: event.target.value }))
                }
              >
                {queues.map((queue) => (
                  <option key={queue.id} value={queue.id}>
                    {queue.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </CardSection>
      </Card>

      {canManage && !ticket.isMerged ? (
        <EscalatePanel ticket={ticket} spaces={spaces} users={users} />
      ) : null}

      {canManage && !ticket.isMerged ? <RelatedPanel ticket={ticket} onError={setError} /> : null}
    </div>
  );
}

/** Support answers questions; engineering changes software. Escalation is where that line is. */
function EscalatePanel({
  ticket,
  spaces,
  users,
}: {
  ticket: TicketProperties;
  spaces: { id: string; name: string }[];
  users: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(escalateAction, initialState);

  if (ticket.escalatedTaskId) {
    return (
      <Card>
        <CardSection title="Engineering">
          <p className="text-sm text-[var(--color-ink-muted)]">
            Escalated as{' '}
            <Link
              href={`/tasks/${ticket.escalatedTaskId}`}
              className="font-medium text-[var(--color-ink)] underline underline-offset-4"
            >
              {ticket.escalatedTaskNumber ?? 'the linked task'}
            </Link>
            .
          </p>
        </CardSection>
      </Card>
    );
  }

  if (spaces.length === 0) return null;

  return (
    <Card>
      <CardSection title="Engineering">
        {open ? (
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="ticketId" value={ticket.id} />

            <Field label="Space">
              <Select name="spaceId" required defaultValue={spaces[0]?.id}>
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Task title" hint="Leave empty to use the ticket number and subject">
              <Input name="title" />
            </Field>

            <Field label="Assign to">
              <Select name="assigneeIds" defaultValue="">
                <option value="">Nobody yet</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </Select>
            </Field>

            {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? 'Escalating' : 'Create task'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <>
            <p className="text-sm text-[var(--color-ink-muted)]">
              Needs a code change rather than an answer.
            </p>
            <Button className="mt-2" variant="secondary" onClick={() => setOpen(true)}>
              Escalate to a task
            </Button>
          </>
        )}
      </CardSection>
    </Card>
  );
}

/**
 * Duplicates and relatives.
 *
 * Merging moves the conversation onto the survivor and leaves the merged ticket pointing at it,
 * because its number was quoted in an email once. Linking is symmetric and changes nothing else.
 */
function RelatedPanel({
  ticket,
  onError,
}: {
  ticket: TicketProperties;
  onError: (message: string | null) => void;
}) {
  const [mode, setMode] = useState<'none' | 'link' | 'merge'>('none');
  const [linkState, linkFormAction, linking] = useActionState(linkAction, initialState);
  const [mergeState, mergeFormAction, merging] = useActionState(mergeAction, initialState);
  const [, startTransition] = useTransition();

  return (
    <Card>
      <CardSection title="Related tickets">
        {ticket.linkedTickets.length > 0 ? (
          <ul className="mb-3 space-y-1.5">
            {ticket.linkedTickets.map((related) => (
              <li key={related.id} className="flex items-center gap-2 text-sm">
                <Link
                  href={`/support/tickets/${related.id}`}
                  className="min-w-0 flex-1 truncate text-[var(--color-ink)] underline-offset-4 hover:underline"
                >
                  <span className="font-mono text-[11px] text-[var(--color-ink-subtle)]">
                    {related.number}
                  </span>{' '}
                  {related.subject}
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    onError(null);
                    startTransition(async () => {
                      const result = await unlinkAction({ id: ticket.id, otherId: related.id });
                      if (result.error) onError(result.error);
                    });
                  }}
                  className="text-[11px] text-[var(--color-ink-subtle)] hover:text-[var(--color-status-alert)]"
                >
                  Unlink
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-sm text-[var(--color-ink-muted)]">Nothing linked yet.</p>
        )}

        {mode === 'link' ? (
          <form action={linkFormAction} className="space-y-2">
            <input type="hidden" name="ticketId" value={ticket.id} />

            <Field label="Link to">
              <TicketPicker
                name="otherId"
                excludeId={ticket.id}
                label="Search by number or subject"
              />
            </Field>

            {linkState.error ? <Notice tone="alert">{linkState.error}</Notice> : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={linking}>
                {linking ? 'Linking' : 'Link'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setMode('none')}>
                Cancel
              </Button>
            </div>
          </form>
        ) : mode === 'merge' ? (
          <form action={mergeFormAction} className="space-y-2">
            <input type="hidden" name="sourceId" value={ticket.id} />

            <Field
              label="Merge this ticket into"
              hint="This conversation moves there and this ticket closes, pointing at it."
            >
              <TicketPicker
                name="targetId"
                excludeId={ticket.id}
                label="Search by number or subject"
              />
            </Field>

            {mergeState.error ? <Notice tone="alert">{mergeState.error}</Notice> : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={merging}>
                {merging ? 'Merging' : 'Merge'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setMode('none')}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setMode('link')}>
              Link a ticket
            </Button>
            <Button variant="secondary" onClick={() => setMode('merge')}>
              Merge away
            </Button>
          </div>
        )}
      </CardSection>
    </Card>
  );
}
