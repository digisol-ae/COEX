'use client';

import { useActionState, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Button, Card, CardSection, Notice } from '@/components/ui';
import { expandCannedReply, type ReplyContext } from '@/modules/tickets/canned-reply-text';
import type { CannedReplySummary } from '@/modules/tickets/services/canned-reply.service';
import { replyAction, type SupportFormState } from '../../actions';

const initialState: SupportFormState = {};

/**
 * Writing a reply.
 *
 * The public and internal choice is a pair of tabs above the box rather than a checkbox beside the
 * send button, and the box itself changes colour with the choice. An agent typing quickly should
 * not be able to mistake one for the other at a glance, because that mistake is the expensive one
 * in this whole module.
 *
 * A saved reply is inserted into the box, expanded, and then edited. It is never sent on its own,
 * so the agent always reads what the customer will read.
 */
export function ReplyBox({
  ticketId,
  cannedReplies,
  context,
}: {
  ticketId: string;
  cannedReplies: CannedReplySummary[];
  context: ReplyContext;
}) {
  const [visibility, setVisibility] = useState<'public' | 'internal'>('public');
  const [usedReplyId, setUsedReplyId] = useState('');
  const [state, formAction, pending] = useActionState(replyAction, initialState);
  const box = useRef<HTMLTextAreaElement>(null);

  const isInternal = visibility === 'internal';

  function insert(reply: CannedReplySummary) {
    const element = box.current;
    if (!element) return;

    const filled = expandCannedReply(reply.body, context);

    element.value = element.value.trim() ? `${element.value.trimEnd()}\n\n${filled}` : filled;
    element.focus();

    setUsedReplyId(reply.id);
  }

  return (
    <Card className={clsx(isInternal && 'border-l-4 border-l-[var(--color-status-warn)]')}>
      <CardSection>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setVisibility('public')}
            aria-pressed={!isInternal}
            className={clsx(
              'rounded-[var(--radius-control)] px-3 py-1.5 text-[13px] transition-colors',
              !isInternal
                ? 'bg-[var(--color-surface-muted)] font-medium text-[var(--color-ink)]'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
            )}
          >
            Reply to customer
          </button>

          <button
            type="button"
            onClick={() => setVisibility('internal')}
            aria-pressed={isInternal}
            className={clsx(
              'rounded-[var(--radius-control)] px-3 py-1.5 text-[13px] transition-colors',
              isInternal
                ? 'bg-[var(--color-status-warn-soft)] font-medium text-[var(--color-status-warn)]'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
            )}
          >
            Internal note
          </button>

          {cannedReplies.length > 0 && !isInternal ? (
            <select
              value=""
              onChange={(event) => {
                const reply = cannedReplies.find(
                  (candidate) => candidate.id === event.target.value,
                );
                if (reply) insert(reply);
              }}
              aria-label="Insert a saved reply"
              className="ml-auto rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-[12px] text-[var(--color-ink-muted)]"
            >
              <option value="">Insert saved reply</option>
              {cannedReplies.map((reply) => (
                <option key={reply.id} value={reply.id}>
                  {reply.title}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        <form action={formAction} className="mt-3 space-y-2">
          <input type="hidden" name="ticketId" value={ticketId} />
          <input type="hidden" name="visibility" value={visibility} />
          <input type="hidden" name="cannedReplyId" value={isInternal ? '' : usedReplyId} />

          <textarea
            ref={box}
            name="body"
            required
            rows={6}
            key={visibility}
            placeholder={
              isInternal
                ? 'A note for colleagues. The customer never sees this.'
                : 'This goes to the customer.'
            }
            className={clsx(
              'w-full rounded-[var(--radius-control)] border px-3 py-2 text-sm text-[var(--color-ink)]',
              isInternal
                ? 'border-[var(--color-status-warn)] bg-[var(--color-status-warn-soft)]/30'
                : 'border-[var(--color-line)] bg-[var(--color-surface)]',
            )}
          />

          {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Sending' : isInternal ? 'Add internal note' : 'Send reply'}
            </Button>

            <p className="text-[11px] text-[var(--color-ink-subtle)]">
              {isInternal
                ? 'Notes never stop the first reply clock.'
                : 'The first reply stops the first response clock.'}
            </p>
          </div>
        </form>
      </CardSection>
    </Card>
  );
}
