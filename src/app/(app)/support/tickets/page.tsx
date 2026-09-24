import Link from 'next/link';
import { asUser, requirePermission } from '@/lib/session';
import {
  listTickets,
  type Priority,
  type TicketStatus,
} from '@/modules/tickets/services/ticket.service';
import { listQueues } from '@/modules/tickets/services/queue.service';
import { listUsers } from '@/modules/core/services/user.service';
import { listOrganisations } from '@/modules/crm/services/organisation.service';
import { STATUS_LABELS } from '@/modules/tickets/labels';
import { Card, EmptyState, Notice, PageHeader } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { SlaChip } from '@/components/ui/sla';
import { formatDateTime } from '@/modules/tasks/dates';
import { TicketFilters } from './filters';
import { NewTicketPanel } from './new-ticket-panel';
import { AgentControl, PriorityControl, TicketRowActions } from './ticket-row-actions';

export const metadata = { title: 'Tickets · COEX' };

/**
 * The ticket list.
 *
 * Ordered by last activity rather than by age, because the ticket someone just replied to is the
 * one that needs an answer, and a list sorted by age puts the forgotten at the bottom where they
 * stay forgotten. The two service level clocks sit in the row, so a breach is visible before it is
 * a conversation with the customer about why nobody answered.
 */
export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{
    queue?: string;
    status?: string;
    assignee?: string;
    priority?: string;
    search?: string;
    scope?: string;
  }>;
}) {
  const actor = await requirePermission('ticket.read.own');
  const params = await searchParams;

  const seesEverything = actor.permissions.includes('ticket.read.all');
  const scope = params.scope ?? (seesEverything ? 'open' : 'mine');

  const { tickets, queues, users, organisations } = await asUser(actor, async () => ({
    tickets: await listTickets({
      queueId: params.queue || undefined,
      status: params.status ? (params.status as TicketStatus) : undefined,
      // An agent without ticket.read.all only ever sees their own, whatever the address bar says.
      assigneeId: seesEverything
        ? scope === 'mine'
          ? actor.id
          : params.assignee || undefined
        : actor.id,
      priority: params.priority ? (params.priority as Priority) : undefined,
      search: params.search,
      openOnly: scope !== 'all' && !params.status,
      unassignedOnly: scope === 'unassigned',
      breachedOnly: scope === 'breached',
    }),
    queues: await listQueues(),
    users: await listUsers(),
    organisations: await listOrganisations(),
  }));

  const canManage = actor.permissions.includes('ticket.manage');

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Tickets"
        description="Support work, newest activity first. Both service level clocks are in the row, so nothing goes quiet without anyone noticing."
        action={
          canManage && queues.length > 0 ? (
            <NewTicketPanel
              queues={queues.map((queue) => ({ id: queue.id, name: queue.name }))}
              organisations={organisations.map((organisation) => ({
                id: organisation.id,
                name: organisation.name,
              }))}
            />
          ) : undefined
        }
      />

      {queues.length === 0 ? (
        <Notice tone="warn">
          There are no queues yet, so a ticket has nowhere to land. Add one in Setup, Queues.
        </Notice>
      ) : null}

      <TicketFilters
        scope={scope}
        queue={params.queue ?? ''}
        status={params.status ?? ''}
        priority={params.priority ?? ''}
        search={params.search ?? ''}
        queues={queues.map((queue) => ({
          id: queue.id,
          name: queue.name,
          openTicketCount: queue.openTicketCount,
        }))}
        canSeeEveryone={seesEverything}
      />

      <Card className="mt-4">
        {tickets.length === 0 ? (
          <EmptyState message="Nothing here. Try another queue, or widen the filters." />
        ) : (
          <>
          <div className="divide-y divide-[var(--color-line)] md:hidden">
            {tickets.map((ticket) => (
              <article key={ticket.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={priorityClass(ticket.priority)}>{ticket.number}</span>
                    <Link
                      href={`/support/tickets/${ticket.id}`}
                      className="mt-2 block text-sm font-medium text-[var(--color-ink)] underline-offset-4 hover:underline"
                    >
                      {ticket.subject}
                    </Link>
                    <p className="mt-1 truncate text-xs text-[var(--color-ink-subtle)]">
                      {[ticket.organisationName, ticket.contactName, ticket.queueName]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {canManage ? (
                      <AgentControl
                        ticketId={ticket.id}
                        assigneeId={ticket.assigneeId}
                        assigneeName={ticket.assigneeName}
                        users={users.map((user) => ({ id: user.id, name: user.name }))}
                      />
                    ) : ticket.assigneeName ? (
                      <Avatar name={ticket.assigneeName} size="small" />
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-[10px] font-medium tracking-wide text-[var(--color-ink-subtle)] uppercase">Status</p>
                    {canManage ? (
                      <TicketRowActions ticket={{ id: ticket.id, status: ticket.status }} />
                    ) : (
                      <span className={statusClass(ticket.status)}>{STATUS_LABELS[ticket.status]}</span>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-medium tracking-wide text-[var(--color-ink-subtle)] uppercase">Priority</p>
                    {canManage ? (
                      <PriorityControl ticketId={ticket.id} priority={ticket.priority} />
                    ) : (
                      <span className={priorityClass(ticket.priority)}>{ticket.priority}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-end justify-between gap-3 text-xs text-[var(--color-ink-muted)]">
                  <div className="flex flex-col gap-0.5">
                    <SlaChip label="Reply" state={ticket.firstResponseState} dueAt={ticket.firstResponseDueAt} />
                    <SlaChip label="Resolve" state={ticket.resolutionState} dueAt={ticket.resolutionDueAt} />
                  </div>
                  <span className="text-right">{formatDateTime(ticket.lastActivityAt)}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[980px] w-full border-collapse text-sm">
            <thead>
              <tr className="text-[11px] tracking-wide text-[var(--color-ink-subtle)] uppercase">
                <th className="w-[12ch] border-b border-[var(--color-line)] px-3 py-2 text-left font-medium">
                  Number
                </th>
                <th className="border-b border-[var(--color-line)] px-3 py-2 text-left font-medium">
                  Subject
                </th>
                <th className="w-52 border-b border-[var(--color-line)] px-3 py-2 text-left font-medium">
                  Status
                </th>
                <th className="w-32 border-b border-[var(--color-line)] px-3 py-2 text-left font-medium">
                  Priority
                </th>
                <th className="w-44 border-b border-[var(--color-line)] px-3 py-2 text-left font-medium">
                  Service level
                </th>
                <th className="w-28 border-b border-[var(--color-line)] px-3 py-2 text-left font-medium">
                  Agent
                </th>
                <th className="w-32 border-b border-[var(--color-line)] px-3 py-2 text-left font-medium">
                  Last activity
                </th>
              </tr>
            </thead>

            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="group border-b border-[var(--color-line)] last:border-b-0 hover:bg-[var(--color-surface-muted)]/60"
                >
                  <td className="px-3 py-2 align-top">
                    <span className={priorityClass(ticket.priority)}>{ticket.number}</span>
                  </td>

                  <td className="px-3 py-2 align-top">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/support/tickets/${ticket.id}`}
                          className="block truncate font-medium text-[var(--color-ink)] underline-offset-4 group-hover:underline"
                        >
                          {ticket.subject}
                        </Link>

                        <p className="truncate text-[11px] text-[var(--color-ink-subtle)]">
                          {[ticket.organisationName, ticket.contactName, ticket.queueName]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-2 align-top">
                    {canManage ? <TicketRowActions ticket={{ id: ticket.id, status: ticket.status }} /> : <span className={statusClass(ticket.status)}>{STATUS_LABELS[ticket.status]}</span>}
                  </td>

                  <td className="px-3 py-2 align-top">
                    {canManage ? <PriorityControl ticketId={ticket.id} priority={ticket.priority} /> : <span className={priorityClass(ticket.priority)}>{ticket.priority}</span>}
                  </td>

                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col gap-0.5">
                      <SlaChip
                        label="Reply"
                        state={ticket.firstResponseState}
                        dueAt={ticket.firstResponseDueAt}
                      />
                      <SlaChip
                        label="Resolve"
                        state={ticket.resolutionState}
                        dueAt={ticket.resolutionDueAt}
                      />
                    </div>
                  </td>

                  <td className="px-3 py-2 align-top">
                    {canManage ? <AgentControl ticketId={ticket.id} assigneeId={ticket.assigneeId} assigneeName={ticket.assigneeName} users={users.map((user) => ({ id: user.id, name: user.name }))} /> : ticket.assigneeName ? (
                      <span className="flex items-center gap-1.5">
                        <Avatar name={ticket.assigneeName} size="small" />
                        <span className="truncate text-[12px] text-[var(--color-ink-muted)]">
                          {ticket.assigneeName.split(' ')[0]}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[12px] text-[var(--color-status-warn)]">
                        Unassigned
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-2 align-top text-[12px] text-[var(--color-ink-muted)]">
                    {formatDateTime(ticket.lastActivityAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          </>
        )}
      </Card>

      <p className="mt-3 text-xs text-[var(--color-ink-subtle)]">
        {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
        {users.length > 0 ? ` · ${queues.length} ${queues.length === 1 ? 'queue' : 'queues'}` : ''}
      </p>
    </div>
  );
}

function priorityClass(priority: Priority) {
  const tone = {
    urgent: 'text-[var(--color-status-alert)]',
    high: 'text-[var(--color-status-warn)]',
    normal: 'text-[var(--color-ink-muted)]',
    low: 'text-[var(--color-status-ok)]',
  }[priority];
  return `inline-flex font-mono text-[11px] font-semibold ${tone}`;
}

function statusClass(status: TicketStatus) {
  const tone = {
    new: 'text-[var(--color-status-info)]',
    open: 'text-[var(--color-status-info)]',
    pending_customer: 'text-[var(--color-status-warn)]',
    escalated: 'text-[var(--color-status-alert)]',
    resolved: 'text-[var(--color-status-ok)]',
    closed: 'text-[var(--color-status-ok)]',
  }[status];
  return `text-xs font-semibold ${tone}`;
}
