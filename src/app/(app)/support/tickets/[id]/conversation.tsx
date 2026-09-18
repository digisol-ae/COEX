import { clsx } from 'clsx';
import { Card, CardSection, EmptyState } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { formatDateTime } from '@/modules/tasks/dates';
import { channelLabel } from '@/modules/tickets/labels';
import type { TicketMessageView } from '@/modules/tickets/services/ticket.service';
import { formatBytes } from '@/modules/tickets/services/attachment.service';

/**
 * The conversation.
 *
 * Public replies and internal notes are never rendered alike. A note carries a warm tint, a left
 * rule and the word Internal in its header, and it is always visibly a different object from a
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

  return (
    <div className="space-y-3">
      {messages.map((message) => {
        const isInternal = message.visibility === 'internal';
        const isSystem = message.channel === 'system';

        if (isSystem) {
          return (
            <p
              key={message.id}
              className="px-3 text-center text-[11px] text-[var(--color-ink-subtle)]"
            >
              {message.body} · {formatDateTime(message.sentAt)}
            </p>
          );
        }

        return (
          <Card
            key={message.id}
            className={clsx(
              isInternal &&
                'border-l-4 border-l-[var(--color-status-warn)] bg-[var(--color-status-warn-soft)]/40',
            )}
          >
            <CardSection>
              <div className="flex items-start gap-2.5">
                <Avatar name={message.authorName} size="small" />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-medium text-[var(--color-ink)]">
                      {message.authorName}
                    </span>

                    {isInternal ? (
                      <span className="rounded-[var(--radius-control)] bg-[var(--color-status-warn-soft)] px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[var(--color-status-warn)] uppercase">
                        Internal note
                      </span>
                    ) : (
                      <span className="text-[11px] text-[var(--color-ink-subtle)]">
                        {message.direction === 'inbound'
                          ? 'From the customer'
                          : 'Sent to the customer'}
                      </span>
                    )}

                    <span className="ml-auto text-[11px] text-[var(--color-ink-subtle)]">
                      {channelLabel(message.channel, message.direction)} ·{' '}
                      {formatDateTime(message.sentAt)}
                    </span>
                  </div>

                  <p className="mt-1.5 text-sm whitespace-pre-wrap text-[var(--color-ink-muted)]">
                    {message.body}
                  </p>

                  {message.attachments.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {message.attachments.map((attachment) => (
                        <li key={attachment.id}>
                          <a
                            href={`/api/tickets/${ticketId}/attachments/${attachment.id}`}
                            className="flex items-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] px-2 py-1 text-[11px] text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
                          >
                            <Paperclip />
                            {attachment.fileName}
                            <span className="text-[var(--color-ink-subtle)]">
                              {formatBytes(attachment.bytes)}
                              {attachment.originalBytes
                                ? `, from ${formatBytes(attachment.originalBytes)}`
                                : ''}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </CardSection>
          </Card>
        );
      })}
    </div>
  );
}

function Paperclip() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M9 4.2 5.1 8.1a1.6 1.6 0 0 1-2.2-2.2l4.2-4.2a2.6 2.6 0 0 1 3.7 3.7L6.3 9.9a3.7 3.7 0 0 1-5.2-5.2"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
