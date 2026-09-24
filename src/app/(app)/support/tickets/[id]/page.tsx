import { notFound } from 'next/navigation';
import Link from 'next/link';
import { asUser, requirePermission } from '@/lib/session';
import { getTicketDetail } from '@/modules/tickets/services/ticket.service';
import { listQueues } from '@/modules/tickets/services/queue.service';
import { listCannedReplies } from '@/modules/tickets/services/canned-reply.service';
import { listUsers } from '@/modules/core/services/user.service';
import { listSpaces } from '@/modules/tasks/services/space.service';
import { STATUS_LABELS, CHANNEL_LABELS } from '@/modules/tickets/labels';
import { Card, CardSection, PageHeader } from '@/components/ui';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { StatusPill } from '@/components/ui/pill';
import { SlaChip } from '@/components/ui/sla';
import { formatDateTime } from '@/modules/tasks/dates';
import { formatMinutes } from '@/modules/time/week';
import { getRunningTimer, loggedMinutesForTicket } from '@/modules/time/services/time.service';
import { TicketTimerButton } from '@/modules/time/components/ticket-timer-button';
import { Conversation } from './conversation';
import { ReplyBox } from './reply-box';
import { Properties } from './properties';

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission('ticket.read.own');
  const { id } = await params;

  const ticket = await asUser(actor, () => getTicketDetail(id));
  if (!ticket) notFound();

  const seesEverything = actor.permissions.includes('ticket.read.all');
  if (!seesEverything && ticket.assigneeId !== actor.id) notFound();

  const canManage = actor.permissions.includes('ticket.manage');

  const { queues, users, spaces, cannedReplies, runningTimer, loggedMinutes } = await asUser(
    actor,
    async () => ({
      queues: await listQueues(),
      users: await listUsers(),
      spaces: actor.permissions.includes('task.manage') ? await listSpaces() : [],
      cannedReplies: await listCannedReplies({ queueId: ticket.queueId }),
      runningTimer: await getRunningTimer(),
      loggedMinutes: await loggedMinutesForTicket(id),
    }),
  );

  const timerRunning = runningTimer?.kind === 'ticket' && runningTimer.itemId === id;

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumb
        trail={[
          { label: 'Support', href: '/support/tickets' },
          { label: ticket.queueName, href: `/support/tickets?queue=${ticket.queueId}` },
          { label: ticket.number },
        ]}
      />

      <div className="mt-2">
        <PageHeader
          title={ticket.subject}
          description={
            ticket.organisationName
              ? `${ticket.organisationName}${ticket.contactName ? ` · ${ticket.contactName}` : ''}`
              : 'No customer on this ticket yet.'
          }
          action={
            <div className="flex flex-col items-end gap-1">
              <StatusPill status={STATUS_LABELS[ticket.status]} isClosed={!ticket.isOpen} />
              <span className="font-mono text-[11px] text-[var(--color-ink-subtle)]">
                {ticket.number}
              </span>
            </div>
          }
        />
      </div>

      {ticket.mergedIntoId ? (
        <Card className="mt-3 border-[var(--color-status-warn)]">
          <CardSection>
            <p className="text-sm text-[var(--color-ink-muted)]">
              This ticket was merged. The conversation continues on{' '}
              <Link
                href={`/support/tickets/${ticket.mergedIntoId}`}
                className="font-medium text-[var(--color-ink)] underline underline-offset-4"
              >
                the surviving ticket
              </Link>
              .
            </p>
          </CardSection>
        </Card>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Card>
            <CardSection>
              <div className="flex flex-wrap items-center gap-3 text-[12px] text-[var(--color-ink-muted)]">
                <SlaChip
                  label="First reply"
                  state={ticket.firstResponseState}
                  dueAt={ticket.firstResponseDueAt}
                />
                <SlaChip
                  label="Resolution"
                  state={ticket.resolutionState}
                  dueAt={ticket.resolutionDueAt}
                />
                <span>{CHANNEL_LABELS[ticket.channel] ?? ticket.channel}</span>
                <span>Raised {formatDateTime(ticket.createdAt)}</span>
                {loggedMinutes > 0 ? <span>{formatMinutes(loggedMinutes)} logged</span> : null}
              </div>

              <div className="mt-3">
                <TicketTimerButton ticketId={ticket.id} running={timerRunning} />
              </div>
            </CardSection>
          </Card>

          <Conversation ticketId={ticket.id} messages={ticket.messages} />

          {canManage && !ticket.mergedIntoId ? (
            <ReplyBox
              ticketId={ticket.id}
              cannedReplies={cannedReplies}
              context={{
                contactName: ticket.contactName,
                organisationName: ticket.organisationName,
                agentName: actor.name,
                ticketNumber: ticket.number,
                ticketSubject: ticket.subject,
                signature: ticket.queueSignature,
              }}
            />
          ) : null}
        </div>

        <Properties
          ticket={{
            id: ticket.id,
            status: ticket.status,
            priority: ticket.priority,
            queueId: ticket.queueId,
            assigneeId: ticket.assigneeId,
            escalatedTaskId: ticket.escalatedTaskId,
            escalatedTaskNumber: ticket.escalatedTaskNumber,
            linkedTickets: ticket.linkedTickets,
            isOpen: ticket.isOpen,
            isMerged: Boolean(ticket.mergedIntoId),
            firstRespondedAt: ticket.firstRespondedAt,
            resolvedAt: ticket.resolvedAt,
          }}
          queues={queues.map((queue) => ({ id: queue.id, name: queue.name }))}
          users={users.map((user) => ({ id: user.id, name: user.name }))}
          spaces={spaces.map((space) => ({ id: space.id, name: space.name }))}
          canManage={canManage}
        />
      </div>
    </div>
  );
}
