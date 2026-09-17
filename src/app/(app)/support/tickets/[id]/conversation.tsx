import { clsx } from 'clsx';
import { Card, CardSection, EmptyState } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { formatDateTime } from '@/modules/tasks/dates';
import { CHANNEL_LABELS } from '@/modules/tickets/labels';
import type { TicketMessageView } from '@/modules/tickets/services/ticket.service';

/**
 * The conversation.
 *
 * Public replies and internal notes are never rendered alike. A note carries a warm tint, a left
 * rule and the word Internal in its header, and it is always visibly a different object from a
 * message the customer has read. This is deliberate over-signalling: the cost of an agent
 * misreading which is which, once, in front of a client, is far higher than the cost of a screen
 * that looks slightly busier.
 */
export function Conversation({ messages }: { messages: TicketMessageView[] }) {
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
                      {CHANNEL_LABELS[message.channel] ?? message.channel} ·{' '}
                      {formatDateTime(message.sentAt)}
                    </span>
                  </div>

                  <p className="mt-1.5 text-sm whitespace-pre-wrap text-[var(--color-ink-muted)]">
                    {message.body}
                  </p>

                  {message.attachments.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {message.attachments.map((attachment) => (
                        <li
                          key={attachment.id}
                          className="rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] px-2 py-1 text-[11px] text-[var(--color-ink-muted)]"
                        >
                          {attachment.fileName}
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
