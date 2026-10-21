import { AttachmentItem } from '@/app/(app)/support/tickets/[id]/attachment-item';
import { formatBytes, PROCESSED_IMAGE_TYPES } from '@/modules/tickets/services/attachment.service';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { asUser, requireUser } from '@/lib/session';
import { portalTicket } from '@/modules/portal/service';
import { PageHeader, Notice } from '@/components/ui';
import { BubbleText } from '@/app/(app)/support/tickets/[id]/bubble-text';
import { formatDateTime, TASK_TIME_ZONE } from '@coex/shared/tasks/dates';
import { STATUS_LABELS } from '@/modules/tickets/labels';
import { PortalTicketForm } from '../../ticket-form';
import { LiveRefresh } from '@/components/ui/live-refresh';
export default async function PortalTicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attachment?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== 'client_contact') redirect('/portal');
  const { id } = await params;
  let ticket;
  try {
    ticket = await asUser(user, () => portalTicket(id));
  } catch {
    return <Notice tone="warn">Portal access is unavailable. Please contact support.</Notice>;
  }
  if (!ticket) notFound();
  const query = await searchParams;
  return (
    <>
      <Link href="/portal" className="text-sm underline">
        My tickets
      </Link>
      <PageHeader
        title={ticket.subject}
        description={
          <>
            {ticket.number} · {STATUS_LABELS[ticket.status as keyof typeof STATUS_LABELS]} ·{' '}
            {formatDateTime(ticket.createdAt)}
          </>
        }
        action={<LiveRefresh />}
      />
      {query.attachment === 'failed' ? (
        <Notice tone="warn">
          Your ticket was created, but attachments could not be added. Please attach them to a reply
          below.
        </Notice>
      ) : null}
      <section
        aria-label="Conversation"
        className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface-sunken)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-4 py-3">
          <h2 className="text-sm font-semibold">Conversation</h2>
          <span className="text-xs text-[var(--color-ink-muted)]">You and support</span>
        </div>
        <ol className="space-y-3 p-3 sm:p-5">
          {ticket.messages.map((message, index) => {
            const yours = message.direction === 'inbound';
            const dayOf = (value: Date | string) =>
              new Intl.DateTimeFormat('en-GB', {
                timeZone: TASK_TIME_ZONE,
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }).format(new Date(value));
            const day = dayOf(message.sentAt);
            const newDay = index === 0 || day !== dayOf(ticket.messages[index - 1].sentAt);
            return (
              <li key={message.id} className="space-y-3">
                {newDay ? (
                  <div className="flex justify-center py-1">
                    <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1 text-[11px] text-[var(--color-ink-muted)]">
                      {day}
                    </span>
                  </div>
                ) : null}
                <div className={`flex ${yours ? 'justify-end' : 'justify-start'}`}>
                  <article
                    aria-label={yours ? 'Your message' : 'Support message'}
                    className={`chat-bubble min-w-0 max-w-[94%] border px-3.5 py-3 shadow-sm sm:max-w-[80%] ${yours ? 'chat-tail-right chat-neon-purple' : 'chat-tail-left chat-neon-green'}`}
                  >
                    <p className="chat-sender mb-1.5 text-xs font-semibold">
                      {yours ? 'You' : message.authorName}
                      {!yours ? (
                        <span className="ml-2 text-[10px] font-normal text-[var(--color-ink-muted)]">
                          Support
                        </span>
                      ) : null}
                    </p>
                    <BubbleText text={message.body} />
                    {message.attachments.length ? (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {message.attachments.map((a) => (
                          <li key={a.id}>
                            <AttachmentItem
                              ticketId={id}
                              attachmentBase="/api/portal/tickets"
                              attachment={{
                                id: a.id,
                                fileName: a.fileName,
                                sizeLabel: formatBytes(a.bytes),
                                previewable: PROCESSED_IMAGE_TYPES.has(a.contentType),
                              }}
                            />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="mt-2 text-right text-[10px] text-[var(--color-ink-muted)]">
                      <time
                        dateTime={new Date(message.sentAt).toISOString()}
                        title={formatDateTime(message.sentAt)}
                      >
                        {new Intl.DateTimeFormat('en-GB', {
                          timeZone: TASK_TIME_ZONE,
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(message.sentAt))}
                      </time>
                    </p>
                  </article>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
      {ticket.canReply ? (
        <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] p-4">
          <h2 className="mb-3 text-sm font-semibold">Reply to support</h2>
          <PortalTicketForm ticketId={id} />
        </section>
      ) : (
        <Notice tone="info">
          This ticket no longer accepts replies.{' '}
          <Link href="/portal/new" className="underline">
            Raise a new ticket
          </Link>{' '}
          if you need more help.
        </Notice>
      )}
    </>
  );
}
