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
import { StatusPill, PriorityFlag } from '@/components/ui/pill';
import { SlaChip } from '@/components/ui/sla';
import { formatDateTime } from '@/modules/tasks/dates';
import { TicketFilters } from './filters';
import { NewTicketPanel } from './new-ticket-panel';

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
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-[11px] tracking-wide text-[var(--color-ink-subtle)] uppercase">
                <th className="w-20 border-b border-[var(--color-line)] px-3 py-2 text-left font-medium">
                  Number
                </th>
                <th className="border-b border-[var(--color-line)] px-3 py-2 text-left font-medium">
                  Subject
                </th>
                <th className="w-36 border-b border-[var(--color-line)] px-3 py-2 text-left font-medium">
                  Status
                </th>
                <th className="w-44 border-b border-[var(--color-line)] px-3 py-2 text-left font-medium">
                  Service level
                </th>
                <th className="w-28 border-b border-[var(--color-line)] px-3 py-2 text-left font-medium">
                  Owner
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
                  <td className="px-3 py-2 align-top font-mono text-[11px] text-[var(--color-ink-subtle)]">
                    {ticket.number}
                  </td>

                  <td className="px-3 py-2 align-top">
                    <div className="flex items-start gap-2">
                      <PriorityFlag priority={ticket.priority} />

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
                    <StatusPill status={STATUS_LABELS[ticket.status]} isClosed={!ticket.isOpen} />
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
                    {ticket.assigneeName ? (
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
        )}
      </Card>

      <p className="mt-3 text-xs text-[var(--color-ink-subtle)]">
        {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
        {users.length > 0 ? ` · ${queues.length} ${queues.length === 1 ? 'queue' : 'queues'}` : ''}
      </p>
    </div>
  );
}
