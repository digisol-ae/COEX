import { clsx } from 'clsx';
import { Card, EmptyState } from '@/components/ui';
import { TASK_TIME_ZONE } from '@coex/shared/tasks/dates';
import { BubbleText } from './bubble-text';
import { channelLabel } from '@/modules/tickets/labels';
import type { TicketMessageView } from '@/modules/tickets/services/ticket.service';
import { formatBytes, PROCESSED_IMAGE_TYPES } from '@/modules/tickets/services/attachment.service';
import { AttachmentItem } from './attachment-item';
import { FoldedMessages } from './folded-messages';

/** More messages than this and the ones between the first and the last are folded. */
const FOLD_ABOVE = 3;

/**
 * The conversation.
 *
 * Shown as a chat: the customer's messages on the left, staff replies on the right, a day label
 * where the day changes. Public replies and internal notes are never rendered alike. A note is
 * dashed and warm, with the words Internal note in its header, and it is always visibly a different object from a
 * message the customer has read. This is deliberate over-signalling: the cost of an agent
 * misreading which is which, once, in front of a client, is far higher than the cost of a screen
 * that looks slightly busier.
 */
export function Conversation({
  ticketId,
  messages,
}: {
  ticketId: string;
  messages: TicketMessageView[];
}) {
  if (messages.length === 0) {
    return (
      <Card>
        <EmptyState message="No messages yet." />
      </Card>
    );
  }

  // Day and time are office time, like every other time in COEX (shared/tasks/dates).
  const dayOf = (value: Date | string) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TASK_TIME_ZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value));
  const timeOf = (value: Date | string) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TASK_TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));

  const render = (message: TicketMessageView, index: number) => {
    const isInternal = message.visibility === 'internal';
    const isSystem = message.channel === 'system';
    const fromCustomer = !isInternal && message.direction === 'inbound';
    const day = dayOf(message.sentAt);
    const newDay = index === 0 || day !== dayOf(messages[index - 1].sentAt);

    const separator = newDay ? (
      <p className="flex justify-center pt-1">
        <span className="rounded-full bg-[var(--color-surface)] px-3 py-0.5 text-[11px] font-medium text-[var(--color-ink-subtle)] shadow-sm">
          {day}
        </span>
      </p>
    ) : null;

    if (isSystem) {
      return (
        <div key={message.id} className="space-y-2">
          {separator}
          <p className="px-3 text-center text-[11px] text-[var(--color-ink-subtle)]">
            {message.body} · {timeOf(message.sentAt)}
          </p>
        </div>
      );
    }

    // A chat, like WhatsApp (John, 18 Oct 2026): the customer on the left, staff on the right. An
    // internal note is on the staff side but dashed and warm, with its own label, so it can never
    // be mistaken for something the customer reads.
    return (
      <div key={message.id} className="space-y-2">
        {separator}
        <div className={clsx('flex', fromCustomer ? 'justify-start' : 'justify-end')}>
          <div
            className={clsx(
              'max-w-[88%] min-w-0 px-3 py-2 shadow-sm sm:max-w-[78%]',
              fromCustomer &&
                'rounded-2xl rounded-tl-sm border border-[var(--color-line)] bg-[var(--color-surface)]',
              !fromCustomer &&
                !isInternal &&
                'rounded-2xl rounded-tr-sm bg-[var(--color-status-ok-soft)]',
              isInternal &&
                'rounded-2xl rounded-tr-sm border border-dashed border-[var(--color-status-warn)] bg-[var(--color-status-warn-soft)]',
            )}
          >
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span
                className={clsx(
                  'text-xs font-semibold',
                  fromCustomer
                    ? 'text-[var(--color-status-info)]'
                    : isInternal
                      ? 'text-[var(--color-status-warn)]'
                      : 'text-[var(--color-status-ok)]',
                )}
              >
                {message.authorName}
              </span>
              {isInternal ? (
                <span className="rounded-[var(--radius-control)] bg-[var(--color-surface)]/70 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[var(--color-status-warn)] uppercase">
                  Internal note
                </span>
              ) : null}
            </div>

            <div className="mt-0.5">
              <BubbleText text={message.body} />
            </div>

            {message.attachments.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {message.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <AttachmentItem
                      ticketId={ticketId}
                      attachment={{
                        id: attachment.id,
                        fileName: attachment.fileName,
                        previewable: PROCESSED_IMAGE_TYPES.has(attachment.contentType),
                        sizeLabel: attachment.originalBytes
                          ? `${formatBytes(attachment.bytes)}, from ${formatBytes(attachment.originalBytes)}`
                          : formatBytes(attachment.bytes),
                      }}
                    />
                  </li>
                ))}
              </ul>
            ) : null}

            <p className="mt-1 text-right text-[10px] text-[var(--color-ink-subtle)]">
              {channelLabel(message.channel, message.direction)} · {timeOf(message.sentAt)}
              {!fromCustomer && !isInternal ? ' · sent to the customer' : ''}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // A long thread keeps its first and its latest message in view and folds the ones between, with
  // a button to open them (John's team, 18 Oct 2026: a page of messages made the ticket one long
  // scroll). Short threads show everything.
  const rendered = messages.map((message, index) => render(message, index));

  return (
    <div className="space-y-2 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface-sunken)] p-3 sm:p-4">
      {messages.length > FOLD_ABOVE ? (
        <>
          {rendered[0]}
          <FoldedMessages count={messages.length - 2}>{rendered.slice(1, -1)}</FoldedMessages>
          {rendered[rendered.length - 1]}
        </>
      ) : (
        rendered
      )}
    </div>
  );
}
