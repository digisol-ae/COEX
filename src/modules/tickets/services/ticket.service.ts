import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { repository } from '@/lib/repository';
import { toObjectId, toOptionalObjectId } from '@/lib/ids';
import { recordAudit, changedFields } from '@/modules/core/services/audit.service';
import { nextNumber } from '@/modules/core/services/numbering.service';
import { recordActivity } from '@/modules/crm/services/activity.service';
import { TenantModel } from '@/modules/core/models/tenant.model';
import { UserModel } from '@/modules/core/models/user.model';
import { TicketModel } from '../models/ticket.model';
import { TicketMessageModel } from '../models/ticket-message.model';
import { QueueModel, DEFAULT_TARGETS } from '../models/queue.model';
import {
  DEFAULT_CALENDAR,
  addWorkingMinutes,
  workingMinutesBetween,
  type WorkingCalendar,
} from '../business-hours';

/**
 * Tickets.
 *
 * Two rules are worth knowing before changing anything here. Service level targets are measured in
 * working minutes, so a four hour promise made on Friday evening lands on Monday rather than
 * expiring overnight. And reopening a closed ticket creates a linked follow up rather than
 * reviving it, so last quarter's resolution figures cannot change after the fact.
 */

const tickets = () => repository(TicketModel);

export type TicketStatus =
  'new' | 'open' | 'pending_customer' | 'escalated' | 'resolved' | 'closed';

export type Priority = 'urgent' | 'high' | 'normal' | 'low';

async function calendarForTenant(): Promise<WorkingCalendar> {
  const tenant = await TenantModel.findOne({ _id: getContext().tenantId });

  return {
    workingDays: tenant?.workingDays?.length ? tenant.workingDays : DEFAULT_CALENDAR.workingDays,
    dayStartMinutes: tenant?.dayStartMinutes ?? DEFAULT_CALENDAR.dayStartMinutes,
    dayEndMinutes: tenant?.dayEndMinutes ?? DEFAULT_CALENDAR.dayEndMinutes,
  };
}

export interface CreateTicketInput {
  subject: string;
  body: string;
  queueId: string;
  priority?: Priority;
  organisationId?: string | null;
  contactId?: string | null;
  productId?: string | null;
  channel?: 'agent' | 'portal' | 'email' | 'whatsapp';
  authorName?: string;
}

export async function createTicket(input: CreateTicketInput): Promise<string> {
  await connectToDatabase();

  const context = getContext();

  const queue = await QueueModel.findOne({
    _id: toObjectId(input.queueId),
    tenantId: context.tenantId,
    deletedAt: null,
  });

  if (!queue) throw new Error('Queue not found.');

  const priority = input.priority ?? 'normal';
  const target =
    queue.targets.find((candidate) => candidate.priority === priority) ??
    DEFAULT_TARGETS.find((candidate) => candidate.priority === priority)!;

  const calendar = await calendarForTenant();
  const now = new Date();

  const created = await tickets().create({
    number: await nextNumber('ticket'),
    subject: input.subject.trim(),
    queueId: queue._id,
    status: 'new',
    priority,
    organisationId: toOptionalObjectId(input.organisationId),
    contactId: toOptionalObjectId(input.contactId),
    productId: toOptionalObjectId(input.productId ?? queue.productId),
    assigneeId: queue.defaultAssigneeId ?? null,
    channel: input.channel ?? 'agent',
    firstResponseDueAt: addWorkingMinutes(now, target.firstResponseMinutes, calendar),
    resolutionDueAt: addWorkingMinutes(now, target.resolutionMinutes, calendar),
    lastActivityAt: now,
    createdById: context.userId,
  });

  const author = await UserModel.findOne({ _id: context.userId }).select('name');

  await TicketMessageModel.create({
    tenantId: context.tenantId,
    ticketId: created._id,
    visibility: 'public',
    direction: input.channel === 'agent' ? 'outbound' : 'inbound',
    body: input.body.trim(),
    authorUserId: context.userId,
    authorName: input.authorName ?? author?.name ?? 'Unknown',
    channel: input.channel ?? 'agent',
  });

  await recordAudit({
    action: 'ticket.created',
    entityType: 'Ticket',
    entityId: created._id,
    after: { number: created.number, subject: created.subject, queue: queue.name },
  });

  if (created.organisationId) {
    await recordActivity({
      organisationId: created.organisationId,
      contactId: created.contactId,
      kind: 'ticket_opened',
      summary: `${created.number} ${created.subject}`,
      sourceModule: 'tickets',
      sourceId: created._id,
      direction: 'inbound',
    });
  }

  return String(created._id);
}

export interface ReplyInput {
  ticketId: string;
  body: string;
  visibility: 'public' | 'internal';
}

/**
 * A reply or an internal note.
 *
 * The first public reply from staff stops the first response clock. An internal note never does,
 * because a note to a colleague is not an answer to the customer, and counting it as one is how
 * service level reports become flattering fiction.
 */
export async function addReply(input: ReplyInput): Promise<void> {
  await connectToDatabase();

  const context = getContext();
  const ticket = await tickets().findById(input.ticketId);
  if (!ticket) throw new Error('Ticket not found.');

  const author = await UserModel.findOne({ _id: context.userId }).select('name');
  const now = new Date();

  await TicketMessageModel.create({
    tenantId: context.tenantId,
    ticketId: ticket._id,
    visibility: input.visibility,
    direction: 'outbound',
    body: input.body.trim(),
    authorUserId: context.userId,
    authorName: author?.name ?? 'Unknown',
    channel: 'agent',
  });

  const update: Record<string, unknown> = { lastActivityAt: now };

  if (input.visibility === 'public') {
    if (!ticket.firstRespondedAt) {
      const calendar = await calendarForTenant();

      update.firstRespondedAt = now;
      update.firstResponseMinutes = workingMinutesBetween(ticket.createdAt, now, calendar);
      update.firstResponseBreached = Boolean(
        ticket.firstResponseDueAt && now > ticket.firstResponseDueAt,
      );
    }

    if (ticket.status === 'new') update.status = 'open';
  }

  await tickets().updateOne({ _id: ticket._id }, { $set: update });

  if (input.visibility === 'public' && ticket.organisationId) {
    await recordActivity({
      organisationId: ticket.organisationId,
      contactId: ticket.contactId,
      kind: 'ticket_replied',
      summary: `${ticket.number} ${ticket.subject}`,
      sourceModule: 'tickets',
      sourceId: ticket._id,
      direction: 'outbound',
    });
  }
}

const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  new: ['open', 'pending_customer', 'escalated', 'resolved'],
  open: ['pending_customer', 'escalated', 'resolved'],
  pending_customer: ['open', 'escalated', 'resolved'],
  escalated: ['open', 'pending_customer', 'resolved'],
  resolved: ['open', 'closed'],
  // Nothing leaves Closed. Reopening creates a follow up ticket instead.
  closed: [],
};

export async function changeStatus(ticketId: string, status: TicketStatus): Promise<void> {
  await connectToDatabase();

  const ticket = await tickets().findById(ticketId);
  if (!ticket) throw new Error('Ticket not found.');

  const current = ticket.status as TicketStatus;

  if (current === status) return;

  if (!ALLOWED_TRANSITIONS[current].includes(status)) {
    throw new Error(
      current === 'closed'
        ? 'A closed ticket cannot be reopened. Create a follow up instead, so past figures stay honest.'
        : `A ticket cannot move from ${current.replace('_', ' ')} to ${status.replace('_', ' ')}.`,
    );
  }

  const now = new Date();
  const update: Record<string, unknown> = { status, lastActivityAt: now };

  if (status === 'resolved') {
    const calendar = await calendarForTenant();

    update.resolvedAt = now;
    update.resolutionMinutes = workingMinutesBetween(ticket.createdAt, now, calendar);
    update.resolutionBreached = Boolean(ticket.resolutionDueAt && now > ticket.resolutionDueAt);
  }

  if (status === 'closed') update.closedAt = now;
  if (status === 'open' && current === 'resolved') {
    update.resolvedAt = null;
    update.resolutionMinutes = null;
  }

  await tickets().updateOne({ _id: ticket._id }, { $set: update });

  await recordAudit({
    action: 'ticket.status_changed',
    entityType: 'Ticket',
    entityId: ticket._id,
    ...changedFields({ status: current }, { status }),
  });

  if (status === 'resolved' && ticket.organisationId) {
    await recordActivity({
      organisationId: ticket.organisationId,
      contactId: ticket.contactId,
      kind: 'ticket_resolved',
      summary: `${ticket.number} ${ticket.subject}`,
      sourceModule: 'tickets',
      sourceId: ticket._id,
      direction: 'outbound',
    });
  }
}

/** Reopening a closed ticket: a new ticket, linked both ways, carrying the context across. */
export async function createFollowOn(ticketId: string): Promise<string> {
  await connectToDatabase();

  const original = await tickets().findById(ticketId);
  if (!original) throw new Error('Ticket not found.');

  const followOnId = await createTicket({
    subject: `${original.subject} (follow up)`,
    body: `Follow up to ${original.number}.`,
    queueId: String(original.queueId),
    priority: original.priority as Priority,
    organisationId: original.organisationId ? String(original.organisationId) : null,
    contactId: original.contactId ? String(original.contactId) : null,
    productId: original.productId ? String(original.productId) : null,
  });

  await tickets().updateOne(
    { _id: toObjectId(followOnId) },
    { $set: { followsOnFromId: original._id } },
  );

  await tickets().updateOne(
    { _id: original._id },
    { $addToSet: { linkedTicketIds: toObjectId(followOnId) } },
  );

  return followOnId;
}
