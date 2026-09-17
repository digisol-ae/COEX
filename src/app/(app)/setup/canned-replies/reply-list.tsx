'use client';

import { useActionState, useState } from 'react';
import { Badge, Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import { PLACEHOLDERS } from '@/modules/tickets/canned-reply-text';
import type { CannedReplySummary } from '@/modules/tickets/services/canned-reply.service';
import {
  archiveCannedReplyAction,
  restoreCannedReplyAction,
  saveCannedReplyAction,
  type SupportFormState,
} from '../../support/actions';

const initialState: SupportFormState = {};

export function CannedReplyList({
  replies,
  queues,
}: {
  replies: CannedReplySummary[];
  queues: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {editing === 'new' ? (
        <ReplyForm queues={queues} onClose={() => setEditing(null)} />
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
                  <Button variant="secondary" onClick={() => setEditing(reply.id)}>
                    Edit
                  </Button>

                  <form
                    action={reply.isArchived ? restoreCannedReplyAction : archiveCannedReplyAction}
                  >
                    <input type="hidden" name="id" value={reply.id} />
                    <Button type="submit" variant="secondary">
                      {reply.isArchived ? 'Restore' : 'Archive'}
                    </Button>
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
  onClose,
}: {
  reply?: CannedReplySummary;
  queues: { id: string; name: string }[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveCannedReplyAction, initialState);

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
              <Select name="queueId" defaultValue={reply?.queueId ?? ''}>
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
              defaultValue={reply?.body}
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

          <div className="flex gap-2">
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
