import type { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { repository } from '@/lib/repository';
import { toObjectId, toOptionalObjectId } from '@/lib/ids';
import { recordAudit, changedFields } from '@/modules/core/services/audit.service';
import { nextNumber } from '@/modules/core/services/numbering.service';
import { recordActivity } from '@/modules/crm/services/activity.service';
import { TenantModel } from '@/modules/core/models/tenant.model';
import { UserModel } from '@/modules/core/models/user.model';
import { OrganisationModel } from '@/modules/crm/models/organisation.model';
import { ContactModel } from '@/modules/crm/models/contact.model';
import { TaskModel } from '@/modules/tasks/models/task.model';
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
  /**
   * Raising a ticket on the customer's behalf: a phone call, a corridor conversation, a WhatsApp
   * an agent read on their own phone. The first message is then the customer's words, recorded by
   * us, so it is stored as inbound and attributed to the contact rather than to the agent.
   *
   * This is not cosmetic. An inbound first message leaves the first reply clock running, which is
   * correct: the customer is waiting for an answer. Recording it as our own outbound message would
   * stop that clock the moment the ticket was created and make every such ticket look answered.
   */
  onBehalfOfCustomer?: boolean;
}

export interface CreatedTicket {
  id: string;
  firstMessageId: string;
}

export async function createTicket(input: CreateTicketInput): Promise<CreatedTicket> {
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

  const contact = created.contactId
    ? await ContactModel.findOne({ _id: created.contactId }).select('name')
    : null;

  const onBehalf = input.onBehalfOfCustomer ?? false;

  const customerName =
    input.authorName ??
    contact?.name ??
    (created.organisationId
      ? ((await OrganisationModel.findOne({ _id: created.organisationId }).select('name'))?.name ??
        'The customer')
      : 'The customer');

  const firstMessage = await TicketMessageModel.create({
    tenantId: context.tenantId,
    ticketId: created._id,
    visibility: 'public',
    direction: onBehalf || input.channel !== 'agent' ? 'inbound' : 'outbound',
    body: input.body.trim(),
    // A message recorded on someone's behalf still says who typed it in: authorName is the
    // customer, authorUserId is the agent, and the audit trail keeps both.
    authorUserId: context.userId,
    authorContactId: onBehalf ? (created.contactId ?? null) : null,
    authorName: onBehalf ? customerName : (input.authorName ?? author?.name ?? 'Unknown'),
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

  return { id: String(created._id), firstMessageId: String(firstMessage._id) };
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
export async function addReply(input: ReplyInput): Promise<string> {
  await connectToDatabase();

  const context = getContext();
  const ticket = await tickets().findById(input.ticketId);
  if (!ticket) throw new Error('Ticket not found.');

  const author = await UserModel.findOne({ _id: context.userId }).select('name');
  const now = new Date();

  const message = await TicketMessageModel.create({
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

  return String(message._id);
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

  const followOn = await createTicket({
    subject: `${original.subject} (follow up)`,
    body: `Follow up to ${original.number}.`,
    queueId: String(original.queueId),
    priority: original.priority as Priority,
    organisationId: original.organisationId ? String(original.organisationId) : null,
    contactId: original.contactId ? String(original.contactId) : null,
    productId: original.productId ? String(original.productId) : null,
  });

  await tickets().updateOne(
    { _id: toObjectId(followOn.id) },
    { $set: { followsOnFromId: original._id } },
  );

  await tickets().updateOne(
    { _id: original._id },
    { $addToSet: { linkedTicketIds: toObjectId(followOn.id) } },
  );

  return followOn.id;
}

/**
 * Reading tickets.
 *
 * The list is the screen an agent lives in, so it carries the service level state rather than
 * making the page work it out: whether the first reply is still owed, whether it is close, and
 * whether either promise has already been missed. Colour follows that state and nothing else.
 */

export type SlaState = 'none' | 'met' | 'due' | 'due_soon' | 'breached';

export interface TicketSummary {
  id: string;
  number: string;
  subject: string;
  status: TicketStatus;
  priority: Priority;
  channel: string;
  queueId: string;
  queueName: string;
  organisationId: string | null;
  organisationName: string | null;
  contactName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  firstResponseDueAt: Date | null;
  resolutionDueAt: Date | null;
  firstResponseState: SlaState;
  resolutionState: SlaState;
  isOpen: boolean;
  lastActivityAt: Date;
  createdAt: Date;
}

/** Within this much of a due time, the clock is worth looking at rather than merely running. */
const DUE_SOON_MINUTES = 60;

function slaStateFor(
  dueAt: Date | null | undefined,
  satisfiedAt: Date | null | undefined,
  breached: boolean,
  now: Date,
): SlaState {
  if (!dueAt) return 'none';
  if (satisfiedAt) return breached ? 'breached' : 'met';
  if (breached || now > dueAt) return 'breached';

  return dueAt.getTime() - now.getTime() <= DUE_SOON_MINUTES * 60 * 1000 ? 'due_soon' : 'due';
}

export interface TicketFilter {
  queueId?: string;
  status?: TicketStatus;
  assigneeId?: string;
  organisationId?: string;
  priority?: Priority;
  search?: string;
  /** Open means anything a person still has to deal with, which is every status but the last two. */
  openOnly?: boolean;
  unassignedOnly?: boolean;
  breachedOnly?: boolean;
  limit?: number;
}

export async function listTickets(filter: TicketFilter = {}): Promise<TicketSummary[]> {
  await connectToDatabase();

  const query: Record<string, unknown> = { mergedIntoId: null };

  if (filter.queueId) query.queueId = toObjectId(filter.queueId);
  if (filter.status) query.status = filter.status;
  if (filter.assigneeId) query.assigneeId = toObjectId(filter.assigneeId);
  if (filter.organisationId) query.organisationId = toObjectId(filter.organisationId);
  if (filter.priority) query.priority = filter.priority;
  if (filter.openOnly) query.status = { $nin: ['resolved', 'closed'] };
  if (filter.unassignedOnly) query.assigneeId = null;
  if (filter.breachedOnly) {
    query.$or = [{ firstResponseBreached: true }, { resolutionBreached: true }];
  }

  if (filter.search?.trim()) {
    const term = filter.search.trim();
    const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$and = [{ $or: [{ number: pattern }, { subject: pattern }] }];
  }

  const found = await tickets()
    .find(query)
    .sort({ lastActivityAt: -1 })
    .limit(filter.limit ?? 200);

  return decorate(found);
}

async function decorate(found: Awaited<ReturnType<ReturnType<typeof tickets>['find']>>) {
  const queueIds = [...new Set(found.map((ticket) => String(ticket.queueId)))];
  const userIds = [
    ...new Set(found.filter((t) => t.assigneeId).map((ticket) => String(ticket.assigneeId))),
  ];
  const organisationIds = [
    ...new Set(found.filter((t) => t.organisationId).map((t) => String(t.organisationId))),
  ];
  const contactIds = [...new Set(found.filter((t) => t.contactId).map((t) => String(t.contactId)))];

  const [queueRows, userRows, organisationRows, contactRows] = await Promise.all([
    QueueModel.find({ _id: { $in: queueIds } }).select('name'),
    UserModel.find({ _id: { $in: userIds } }).select('name'),
    OrganisationModel.find({ _id: { $in: organisationIds } }).select('name'),
    ContactModel.find({ _id: { $in: contactIds } }).select('name'),
  ]);

  const queueNames = new Map(queueRows.map((row) => [String(row._id), row.name]));
  const userNames = new Map(userRows.map((row) => [String(row._id), row.name]));
  const organisationNames = new Map(organisationRows.map((row) => [String(row._id), row.name]));
  const contactNames = new Map(contactRows.map((row) => [String(row._id), row.name]));

  const now = new Date();

  return found.map((ticket) => ({
    id: String(ticket._id),
    number: ticket.number,
    subject: ticket.subject,
    status: ticket.status as TicketStatus,
    priority: ticket.priority as Priority,
    channel: ticket.channel,
    queueId: String(ticket.queueId),
    queueName: queueNames.get(String(ticket.queueId)) ?? 'Unknown queue',
    organisationId: ticket.organisationId ? String(ticket.organisationId) : null,
    organisationName: ticket.organisationId
      ? (organisationNames.get(String(ticket.organisationId)) ?? null)
      : null,
    contactName: ticket.contactId ? (contactNames.get(String(ticket.contactId)) ?? null) : null,
    assigneeId: ticket.assigneeId ? String(ticket.assigneeId) : null,
    assigneeName: ticket.assigneeId ? (userNames.get(String(ticket.assigneeId)) ?? null) : null,
    firstResponseDueAt: ticket.firstResponseDueAt ?? null,
    resolutionDueAt: ticket.resolutionDueAt ?? null,
    firstResponseState: slaStateFor(
      ticket.firstResponseDueAt,
      ticket.firstRespondedAt,
      ticket.firstResponseBreached ?? false,
      now,
    ),
    resolutionState: slaStateFor(
      ticket.resolutionDueAt,
      ticket.resolvedAt,
      ticket.resolutionBreached ?? false,
      now,
    ),
    isOpen: !['resolved', 'closed'].includes(ticket.status),
    lastActivityAt: ticket.lastActivityAt ?? ticket.updatedAt,
    createdAt: ticket.createdAt,
  }));
}

export interface TicketMessageView {
  id: string;
  visibility: 'public' | 'internal';
  direction: 'inbound' | 'outbound';
  body: string;
  authorName: string;
  channel: string;
  sentAt: Date;
  attachments: {
    id: string;
    fileName: string;
    contentType: string;
    bytes: number;
    originalBytes: number | null;
  }[];
}

export interface TicketDetail extends TicketSummary {
  contactId: string | null;
  productId: string | null;
  tags: string[];
  escalatedTaskId: string | null;
  escalatedTaskNumber: string | null;
  mergedIntoId: string | null;
  followsOnFromId: string | null;
  linkedTickets: { id: string; number: string; subject: string; status: string }[];
  queueSignature: string | null;
  firstRespondedAt: Date | null;
  resolvedAt: Date | null;
  messages: TicketMessageView[];
}

export async function getTicketDetail(id: string): Promise<TicketDetail | null> {
  await connectToDatabase();

  const ticket = await tickets().findById(id);
  if (!ticket) return null;

  const [summary] = await decorate([ticket]);

  const [queue, messages, linked, task] = await Promise.all([
    QueueModel.findOne({ _id: ticket.queueId }).select('signature'),
    TicketMessageModel.find({
      tenantId: getContext().tenantId,
      ticketId: ticket._id,
    }).sort({ sentAt: 1 }),
    tickets()
      .find({ _id: { $in: ticket.linkedTicketIds } })
      .select('number subject status'),
    ticket.escalatedTaskId
      ? TaskModel.findOne({ _id: ticket.escalatedTaskId, tenantId: getContext().tenantId }).select(
          'number',
        )
      : null,
  ]);

  return {
    ...summary,
    contactId: ticket.contactId ? String(ticket.contactId) : null,
    productId: ticket.productId ? String(ticket.productId) : null,
    tags: ticket.tags ?? [],
    escalatedTaskId: ticket.escalatedTaskId ? String(ticket.escalatedTaskId) : null,
    escalatedTaskNumber: task?.number ?? null,
    mergedIntoId: ticket.mergedIntoId ? String(ticket.mergedIntoId) : null,
    followsOnFromId: ticket.followsOnFromId ? String(ticket.followsOnFromId) : null,
    linkedTickets: linked.map((row) => ({
      id: String(row._id),
      number: row.number,
      subject: row.subject,
      status: row.status,
    })),
    queueSignature: queue?.signature ?? null,
    firstRespondedAt: ticket.firstRespondedAt ?? null,
    resolvedAt: ticket.resolvedAt ?? null,
    messages: messages.map((message) => ({
      id: String(message._id),
      visibility: message.visibility as 'public' | 'internal',
      direction: message.direction as 'inbound' | 'outbound',
      body: message.body,
      authorName: message.authorName,
      channel: message.channel,
      sentAt: message.sentAt ?? message.createdAt,
      attachments: (message.attachments ?? []).map((attachment) => ({
        id: String(attachment._id),
        fileName: attachment.fileName,
        contentType: attachment.contentType,
        bytes: attachment.bytes,
        originalBytes: attachment.originalBytes ?? null,
      })),
    })),
  };
}

/**
 * Changing who owns a ticket, how urgent it is, or which queue it sits in.
 *
 * Moving a queue recomputes the service level clocks from the new queue's targets, because the
 * promise belongs to the queue. It measures from when the ticket arrived, not from the move, so a
 * ticket cannot buy itself a fresh four hours by being passed around.
 */
export async function assignTicket(
  ticketId: string,
  userId: string | null,
  note?: string,
): Promise<void> {
  await connectToDatabase();

  const ticket = await tickets().findById(ticketId);
  if (!ticket) throw new Error('Ticket not found.');
  const changed = String(ticket.assigneeId ?? '') !== String(userId ?? '');
  const reason = note?.trim() ?? '';
  if (changed && ticket.assigneeId && !reason)
    throw new Error('Add a handover comment before assigning this ticket to another agent.');

  await tickets().updateOne(
    { _id: ticket._id },
    { $set: { assigneeId: toOptionalObjectId(userId), lastActivityAt: new Date() } },
  );

  await recordAudit({
    action: 'ticket.assigned',
    entityType: 'Ticket',
    entityId: ticket._id,
    ...changedFields(
      { assigneeId: ticket.assigneeId ? String(ticket.assigneeId) : null },
      { assigneeId: userId },
    ),
  });
  if (changed && reason) {
    const author = await UserModel.findOne({ _id: getContext().userId }).select('name');
    await TicketMessageModel.create({
      tenantId: getContext().tenantId,
      ticketId: ticket._id,
      visibility: 'internal',
      direction: 'outbound',
      body: `Reassigned: ${reason}`,
      authorUserId: getContext().userId,
      authorName: author?.name ?? 'Unknown',
      channel: 'agent',
    });
  }
}

export async function setTicketPriority(ticketId: string, priority: Priority): Promise<void> {
  await connectToDatabase();

  const ticket = await tickets().findById(ticketId);
  if (!ticket) throw new Error('Ticket not found.');
  if (ticket.priority === priority) return;

  const queue = await QueueModel.findOne({ _id: ticket.queueId });
  const target = targetFor(queue?.targets as QueueTargets, priority);
  const calendar = await calendarForTenant();

  const update: Record<string, unknown> = { priority, lastActivityAt: new Date() };

  // A promise that has already been kept is not renegotiated by a later change of priority.
  if (!ticket.firstRespondedAt) {
    update.firstResponseDueAt = addWorkingMinutes(
      ticket.createdAt,
      target.firstResponseMinutes,
      calendar,
    );
  }

  if (!ticket.resolvedAt) {
    update.resolutionDueAt = addWorkingMinutes(
      ticket.createdAt,
      target.resolutionMinutes,
      calendar,
    );
  }

  await tickets().updateOne({ _id: ticket._id }, { $set: update });

  await recordAudit({
    action: 'ticket.priority_changed',
    entityType: 'Ticket',
    entityId: ticket._id,
    ...changedFields({ priority: ticket.priority }, { priority }),
  });
}

export async function moveTicketToQueue(ticketId: string, queueId: string): Promise<void> {
  await connectToDatabase();

  const ticket = await tickets().findById(ticketId);
  if (!ticket) throw new Error('Ticket not found.');

  const queue = await QueueModel.findOne({
    _id: toObjectId(queueId),
    tenantId: getContext().tenantId,
    deletedAt: null,
    status: 'active',
  });

  if (!queue) throw new Error('Queue not found.');
  if (String(queue._id) === String(ticket.queueId)) return;

  const target = targetFor(queue.targets as QueueTargets, ticket.priority as Priority);
  const calendar = await calendarForTenant();

  const update: Record<string, unknown> = { queueId: queue._id, lastActivityAt: new Date() };

  if (!ticket.firstRespondedAt) {
    update.firstResponseDueAt = addWorkingMinutes(
      ticket.createdAt,
      target.firstResponseMinutes,
      calendar,
    );
  }

  if (!ticket.resolvedAt) {
    update.resolutionDueAt = addWorkingMinutes(
      ticket.createdAt,
      target.resolutionMinutes,
      calendar,
    );
  }

  if (!ticket.assigneeId && queue.defaultAssigneeId) update.assigneeId = queue.defaultAssigneeId;

  await tickets().updateOne({ _id: ticket._id }, { $set: update });

  await recordAudit({
    action: 'ticket.queue_changed',
    entityType: 'Ticket',
    entityId: ticket._id,
    ...changedFields({ queueId: String(ticket.queueId) }, { queueId: String(queue._id) }),
  });
}

type QueueTargets =
  { priority: string; firstResponseMinutes: number; resolutionMinutes: number }[] | undefined;

function targetFor(targets: QueueTargets, priority: Priority) {
  return (
    targets?.find((candidate) => candidate.priority === priority) ??
    DEFAULT_TARGETS.find((candidate) => candidate.priority === priority)!
  );
}

/**
 * Escalating a ticket into a task.
 *
 * Support answers questions; engineering changes software. The moment a ticket needs a code
 * change it stops being answerable at the desk, and pretending otherwise is how a ticket sits at
 * "open" for three months. Escalation creates the task, links both records, and leaves the ticket
 * with the customer rather than closing it, because the customer is still waiting.
 */
export async function escalateToTask(input: {
  ticketId: string;
  spaceId: string;
  folderId?: string | null;
  title?: string;
  assigneeIds?: string[];
}): Promise<string> {
  await connectToDatabase();

  const ticket = await tickets().findById(input.ticketId);
  if (!ticket) throw new Error('Ticket not found.');
  if (ticket.escalatedTaskId) throw new Error('This ticket already has a task.');

  const { createTask } = await import('@/modules/tasks/services/task.service');

  const taskId = await createTask({
    spaceId: input.spaceId,
    folderId: input.folderId ?? null,
    title: input.title?.trim() || `${ticket.number} ${ticket.subject}`,
    description: `Raised from support ticket ${ticket.number}.`,
    priority: ticket.priority as Priority,
    assigneeIds: input.assigneeIds ?? [],
    organisationId: ticket.organisationId ? String(ticket.organisationId) : null,
    sourceTicketId: String(ticket._id),
  });

  await tickets().updateOne(
    { _id: ticket._id },
    {
      $set: {
        escalatedTaskId: toObjectId(taskId),
        status: ticket.status === 'closed' ? ticket.status : 'escalated',
        lastActivityAt: new Date(),
      },
    },
  );

  await systemMessage(ticket._id, `Escalated to engineering as a task.`);

  await recordAudit({
    action: 'ticket.escalated',
    entityType: 'Ticket',
    entityId: ticket._id,
    after: { taskId },
  });

  return taskId;
}

/**
 * Merging duplicates.
 *
 * The conversation moves to the survivor, so an agent reading it sees everything the customer
 * said, in order, in one place. The merged ticket stays in the database pointing at the survivor:
 * its number was quoted in an email once, and a number that leads nowhere is worse than a number
 * that leads somewhere with an explanation.
 */
export async function mergeTickets(sourceId: string, targetId: string): Promise<void> {
  await connectToDatabase();

  if (sourceId === targetId) throw new Error('A ticket cannot be merged into itself.');

  const source = await tickets().findById(sourceId);
  const target = await tickets().findById(targetId);

  if (!source) throw new Error('The ticket being merged was not found.');
  if (!target) throw new Error('The ticket being merged into was not found.');
  if (source.mergedIntoId) throw new Error('That ticket has already been merged.');
  if (target.mergedIntoId)
    throw new Error('You cannot merge into a ticket that was itself merged.');

  await TicketMessageModel.updateMany(
    { tenantId: getContext().tenantId, ticketId: source._id },
    { $set: { ticketId: target._id } },
  );

  await systemMessage(target._id, `${source.number} was merged into this ticket.`);

  const now = new Date();

  await tickets().updateOne(
    { _id: source._id },
    {
      $set: {
        mergedIntoId: target._id,
        status: 'closed',
        closedAt: source.closedAt ?? now,
        lastActivityAt: now,
      },
    },
  );

  await tickets().updateOne(
    { _id: target._id },
    { $addToSet: { linkedTicketIds: source._id }, $set: { lastActivityAt: now } },
  );

  await recordAudit({
    action: 'ticket.merged',
    entityType: 'Ticket',
    entityId: source._id,
    after: { into: target.number },
  });
}

/** Two tickets that are related but not the same. The link is symmetric, because relatedness is. */
export async function linkTickets(ticketId: string, otherId: string): Promise<void> {
  await connectToDatabase();

  if (ticketId === otherId) throw new Error('A ticket cannot be linked to itself.');

  const ticket = await tickets().findById(ticketId);
  const other = await tickets().findById(otherId);

  if (!ticket || !other) throw new Error('Ticket not found.');

  await tickets().updateOne({ _id: ticket._id }, { $addToSet: { linkedTicketIds: other._id } });
  await tickets().updateOne({ _id: other._id }, { $addToSet: { linkedTicketIds: ticket._id } });
}

export async function unlinkTickets(ticketId: string, otherId: string): Promise<void> {
  await connectToDatabase();

  const ticket = await tickets().findById(ticketId);
  const other = await tickets().findById(otherId);

  if (!ticket || !other) throw new Error('Ticket not found.');

  await tickets().updateOne({ _id: ticket._id }, { $pull: { linkedTicketIds: other._id } });
  await tickets().updateOne({ _id: other._id }, { $pull: { linkedTicketIds: ticket._id } });
}

/** Finding the ticket to merge into or link to, without loading the whole desk into a dropdown. */
export async function searchTickets(term: string, excludeId?: string): Promise<TicketSummary[]> {
  if (!term.trim()) return [];

  const found = await listTickets({ search: term, limit: 10 });

  return found.filter((ticket) => ticket.id !== excludeId);
}

/** A line in the conversation that nobody typed: a merge, an escalation, a status change. */
async function systemMessage(ticketId: Types.ObjectId, body: string): Promise<void> {
  await TicketMessageModel.create({
    tenantId: getContext().tenantId,
    ticketId,
    visibility: 'internal',
    direction: 'outbound',
    body,
    authorUserId: getContext().userId,
    authorName: 'COEX',
    channel: 'system',
  });
}
