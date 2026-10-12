'use client';

import { useActionState, useEffect, useState } from 'react';
import { Badge, Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { IconButton } from '@/components/ui/icon-button';
import { PLACEHOLDERS, expandCannedReply } from '@coex/shared/tickets/canned-reply-text';
import { customerEmailText, renderSignature } from '@coex/shared/tickets/email-text';
import { EmailPreview, SAMPLE } from '@/components/ui/email-preview';
import type { CannedReplySummary } from '@/modules/tickets/services/canned-reply.service';
import {
  archiveCannedReplyAction,
  restoreCannedReplyAction,
  saveCannedReplyAction,
  type SupportFormState,
} from '../../support/actions';

const initialState: SupportFormState = {};

type QueueOption = { id: string; name: string; signature: string | null; autoSign: boolean };

export function CannedReplyList({
  replies,
  queues,
  from,
}: {
  replies: CannedReplySummary[];
  queues: QueueOption[];
  /** The standard sender, for the email preview. */
  from: string;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {editing === 'new' ? (
        <ReplyForm queues={queues} from={from} onClose={() => setEditing(null)} />
      ) : (
        <Button onClick={() => setEditing('new')}>Add saved reply</Button>
      )}

      {replies.length === 0 ? (
        <Card>
          <CardSection>
            <p className="text-sm text-[var(--color-ink-muted)]">
              Nothing saved yet. The replies worth saving are the ones you have already typed twice.
            </p>
          </CardSection>
        </Card>
      ) : null}

      {replies.map((reply) =>
        editing === reply.id ? (
          <ReplyForm
            key={reply.id}
            reply={reply}
            queues={queues}
            from={from}
            onClose={() => setEditing(null)}
          />
        ) : (
          <Card key={reply.id}>
            <CardSection>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium text-[var(--color-ink)]">{reply.title}</h3>

                    {reply.queueId ? (
                      <Badge tone="neutral">
                        {queues.find((queue) => queue.id === reply.queueId)?.name ?? 'One queue'}
                      </Badge>
                    ) : (
                      <Badge tone="info">Every queue</Badge>
                    )}

                    {reply.isArchived ? <Badge tone="neutral">Archived</Badge> : null}

                    <span className="text-[11px] text-[var(--color-ink-subtle)]">
                      used {reply.useCount} {reply.useCount === 1 ? 'time' : 'times'}
                    </span>
                  </div>

                  <p className="mt-1.5 text-[13px] whitespace-pre-wrap text-[var(--color-ink-muted)]">
                    {reply.body}
                  </p>
                </div>

                <div className="flex gap-2">
                  <IconButton
                    icon="edit"
                    label="Edit this saved reply"
                    onClick={() => setEditing(reply.id)}
                  />

                  <form
                    action={reply.isArchived ? restoreCannedReplyAction : archiveCannedReplyAction}
                  >
                    <input type="hidden" name="id" value={reply.id} />
                    <IconButton
                      type="submit"
                      icon={reply.isArchived ? 'restore' : 'archive'}
                      label={
                        reply.isArchived
                          ? 'Restore this saved reply'
                          : 'Archive this saved reply; it can be restored later'
                      }
                    />
                  </form>
                </div>
              </div>
            </CardSection>
          </Card>
        ),
      )}
    </div>
  );
}

function ReplyForm({
  reply,
  queues,
  from,
  onClose,
}: {
  reply?: CannedReplySummary;
  queues: QueueOption[];
  from: string;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveCannedReplyAction, initialState);
  const { showToast } = useToast();
  const [body, setBody] = useState(reply?.body ?? '');
  const [queueId, setQueueId] = useState(reply?.queueId ?? '');
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (!state.saved) return;
    onClose();
    showToast(reply ? 'Saved reply updated.' : 'Saved reply created.');
  }, [state, showToast, onClose, reply]);

  // Filled the way the reply box fills it, then signed the way the server signs it.
  const queue = queues.find((option) => option.id === queueId);
  const signature = queue
    ? renderSignature(queue.signature, {
        agentName: SAMPLE.agent,
        agentTitle: SAMPLE.agentTitle,
        queueName: queue.name,
      })
    : '';
  const previewText = customerEmailText({
    body: expandCannedReply(body, {
      contactName: SAMPLE.customer,
      organisationName: SAMPLE.company,
      agentName: SAMPLE.agent,
      ticketNumber: SAMPLE.ticket,
      ticketSubject: SAMPLE.subject,
      signature: queue?.autoSign ? '' : signature,
    }),
    signature: queue?.autoSign ? signature : '',
    ticketNumber: SAMPLE.ticket,
  });

  return (
    <Card>
      <CardSection title={reply ? `Edit ${reply.title}` : 'New saved reply'}>
        <form action={formAction} className="space-y-3">
          {reply ? <input type="hidden" name="id" value={reply.id} /> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title" hint="What an agent will scan for">
              <Input name="title" required defaultValue={reply?.title} autoFocus />
            </Field>

            <Field label="Queue" hint="Leave open to offer it everywhere">
              <Select
                name="queueId"
                value={queueId}
                onChange={(event) => setQueueId(event.target.value)}
              >
                <option value="">Every queue</option>
                {queues.map((queue) => (
                  <option key={queue.id} value={queue.id}>
                    {queue.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Body">
            <textarea
              name="body"
              required
              rows={6}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="w-full rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)]"
            />
          </Field>

          <div className="rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] px-3 py-2">
            <p className="text-[11px] tracking-wide text-[var(--color-ink-subtle)] uppercase">
              Placeholders
            </p>
            <ul className="mt-1 grid gap-x-4 gap-y-0.5 text-[12px] text-[var(--color-ink-muted)] sm:grid-cols-2">
              {PLACEHOLDERS.map((placeholder) => (
                <li key={placeholder.token}>
                  <code className="font-mono text-[11px] text-[var(--color-ink)]">
                    {placeholder.token}
                  </code>{' '}
                  {placeholder.describes}
                </li>
              ))}
            </ul>
          </div>

          {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

          {previewing ? (
            <EmailPreview
              from={from}
              to={`${SAMPLE.customer} <${SAMPLE.email}>`}
              subject={`Re: [${SAMPLE.ticket}] ${SAMPLE.subject}`}
              text={previewText}
              note={
                queue
                  ? SAMPLE.note
                  : `${SAMPLE.note} Offered in every queue, so the signature depends on the ticket's queue and is not shown.`
              }
              onClose={() => setPreviewing(false)}
            />
          ) : null}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!body.trim()}
              onClick={() => setPreviewing(true)}
            >
              Preview
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving' : 'Save reply'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </form>
      </CardSection>
    </Card>
  );
}
