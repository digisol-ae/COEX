import { listTasks } from './task.service';
import { listTickets, type TicketSummary } from '@/modules/tickets/services/ticket.service';
import { STATUS_LABELS } from '@/modules/tickets/labels';
import { getContext } from '@/lib/tenant-context';

/**
 * "My work": a person's open tickets and open tasks in one list, soonest due first (John, 26 Sep
 * 2026). Tasks and Tickets reading each other is intended (CLAUDE.md decision 13).
 *
 * One list rather than two because the question an agent asks is "what next", and the answer can
 * be either. Anything without a due time goes after everything with one, most recently active
 * first, so the quiet items are still there but never outrank a deadline.
 */

export type WorkKind = 'ticket' | 'task';
export type WorkFilter = 'all' | 'tickets' | 'tasks';

export interface WorkItem {
  kind: WorkKind;
  id: string;
  number: string;
  title: string;
  href: string;
  status: string;
  priority: string;
  dueAt: Date | null;
  /** What the due time is for, because a ticket's deadline changes once it has been answered. */
  dueLabel: string | null;
  overdue: boolean;
  /** Tickets only: the customer has written since this person last looked. */
  unread: boolean;
  lastActivityAt: Date;
}

export function parseWorkFilter(value: string | undefined): WorkFilter {
  return value === 'tickets' || value === 'tasks' ? value : 'all';
}

export async function loadMyWork(options: {
  filter: WorkFilter;
  seesTickets: boolean;
  seesTasks: boolean;
}): Promise<WorkItem[]> {
  const userId = String(getContext().userId);
  const now = new Date();
  const items: WorkItem[] = [];

  if (options.seesTickets && options.filter !== 'tasks') {
    const tickets = await listTickets({ assigneeId: userId, openOnly: true });
    items.push(...tickets.map((ticket) => fromTicket(ticket, now)));
  }

  if (options.seesTasks && options.filter !== 'tickets') {
    const tasks = await listTasks({ assigneeId: userId });
    items.push(
      ...tasks.map((task) => ({
        kind: 'task' as const,
        id: task.id,
        number: task.number,
        title: task.title,
        href: `/tasks/${task.id}`,
        status: task.status,
        priority: task.priority,
        dueAt: task.endAt,
        dueLabel: task.endAt ? 'Due' : null,
        overdue: task.isOverdue,
        unread: false,
        lastActivityAt: task.lastActivityAt,
      })),
    );
  }

  return sortWork(items);
}

function fromTicket(ticket: TicketSummary, now: Date): WorkItem {
  // Until someone answers, the reply deadline is the one that matters; after that, resolution.
  const awaitingReply = ticket.firstResponseState !== 'met' && ticket.firstResponseDueAt;
  const dueAt = awaitingReply ? ticket.firstResponseDueAt : ticket.resolutionDueAt;

  return {
    kind: 'ticket',
    id: ticket.id,
    number: ticket.number,
    title: ticket.subject,
    href: `/support/tickets/${ticket.id}`,
    status: STATUS_LABELS[ticket.status],
    priority: ticket.priority,
    dueAt,
    dueLabel: dueAt ? (awaitingReply ? 'Reply' : 'Resolve') : null,
    overdue: Boolean(dueAt && dueAt < now),
    unread: ticket.unread,
    lastActivityAt: ticket.lastActivityAt,
  };
}

export function sortWork(items: WorkItem[]): WorkItem[] {
  return [...items].sort((a, b) => {
    if (a.dueAt && b.dueAt) return a.dueAt.getTime() - b.dueAt.getTime();
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return b.lastActivityAt.getTime() - a.lastActivityAt.getTime();
  });
}
