import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { toObjectId, toOptionalObjectId } from '@/lib/ids';
import { recordAudit, changedFields } from '@/modules/core/services/audit.service';
import { UserModel } from '@/modules/core/models/user.model';
import { QueueModel, DEFAULT_TARGETS, type Queue } from '../models/queue.model';
import { TicketModel } from '../models/ticket.model';
import { formatWorkingMinutes } from '../business-hours';

/**
 * Queues.
 *
 * A queue answers two questions: who is expected to pick this up, and how quickly did we promise
 * to answer. Both belong together, because a promise nobody is assigned to keep is not a promise.
 *
 * Targets sit per priority on the queue rather than globally: a hosted product and onsite hardware
 * cannot honestly make the same commitment. They are working minutes, measured against the
 * tenant's calendar, so a four hour promise made on Friday evening lands on Monday morning.
 *
 * Queues are archived, never deleted. A deleted queue would orphan every ticket that ever landed
 * in it, and the history of where work went is the point of having queues at all.
 */

const queues = () => repository(QueueModel);
const tickets = () => repository(TicketModel);

export type Priority = 'urgent' | 'high' | 'normal' | 'low';

export interface QueueTarget {
  priority: Priority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
}

export interface QueueSummary {
  id: string;
  name: string;
  description: string | null;
  signature: string | null;
  isDefault: boolean;
  isArchived: boolean;
  memberIds: string[];
  memberNames: string[];
  defaultAssigneeId: string | null;
  defaultAssigneeName: string | null;
  productId: string | null;
  targets: QueueTarget[];
  openTicketCount: number;
}

/** A queue with no targets of its own still promises something, so the defaults stand in. */
function targetsOf(stored: QueueTarget[] | undefined): QueueTarget[] {
  const byPriority = new Map((stored ?? []).map((target) => [target.priority, target]));

  return (DEFAULT_TARGETS as QueueTarget[]).map(
    (fallback) => byPriority.get(fallback.priority) ?? fallback,
  );
}

export async function listQueues(
  options: { includeArchived?: boolean } = {},
): Promise<QueueSummary[]> {
  await connectToDatabase();

  const found = await queues()
    .find(options.includeArchived ? {} : { status: 'active' as const })
    .sort({ isDefault: -1, name: 1 });

  const userIds = [
    ...new Set(
      found.flatMap((queue) => [
        ...queue.memberIds.map((id) => String(id)),
        ...(queue.defaultAssigneeId ? [String(queue.defaultAssigneeId)] : []),
      ]),
    ),
  ];

  const users = await UserModel.find({ _id: { $in: userIds } }).select('name');
  const names = new Map(users.map((user) => [String(user._id), user.name]));

  const openCounts = await Promise.all(
    found.map((queue) =>
      tickets().count({ queueId: queue._id, status: { $nin: ['resolved', 'closed'] } }),
    ),
  );

  return found.map((queue, index) => ({
    id: String(queue._id),
    name: queue.name,
    description: queue.description ?? null,
    signature: queue.signature ?? null,
    isDefault: queue.isDefault ?? false,
    isArchived: queue.status === 'archived',
    memberIds: queue.memberIds.map((id) => String(id)),
    memberNames: queue.memberIds.map((id) => names.get(String(id)) ?? 'Unknown'),
    defaultAssigneeId: queue.defaultAssigneeId ? String(queue.defaultAssigneeId) : null,
    defaultAssigneeName: queue.defaultAssigneeId
      ? (names.get(String(queue.defaultAssigneeId)) ?? 'Unknown')
      : null,
    productId: queue.productId ? String(queue.productId) : null,
    targets: targetsOf(queue.targets as QueueTarget[]),
    openTicketCount: openCounts[index],
  }));
}

export async function getQueue(id: string) {
  await connectToDatabase();
  return queues().findById(id);
}

export interface QueueInput {
  name: string;
  description?: string | null;
  signature?: string | null;
  productId?: string | null;
  memberIds?: string[];
  defaultAssigneeId?: string | null;
  targets?: QueueTarget[];
  isDefault?: boolean;
}

export async function createQueue(input: QueueInput): Promise<string> {
  await connectToDatabase();

  const name = input.name.trim();
  if (!name) throw new Error('A queue needs a name.');

  const clash = await queues().findOne({ name });
  if (clash) throw new Error(`There is already a queue called ${name}.`);

  // The first queue is the default, because a tenant with no default has nowhere to put a ticket
  // that arrives before anyone has configured anything.
  const existing = await queues().count();
  const isDefault = input.isDefault ?? existing === 0;

  if (isDefault) await clearDefault();

  const created = await queues().create({
    name,
    description: input.description?.trim() || null,
    signature: input.signature?.trim() || null,
    productId: toOptionalObjectId(input.productId),
    memberIds: (input.memberIds ?? []).filter(Boolean).map((id) => toObjectId(id)),
    defaultAssigneeId: toOptionalObjectId(input.defaultAssigneeId),
    targets: asStored(validTargets(input.targets)),
    isDefault,
    status: 'active',
  });

  await recordAudit({
    action: 'queue.created',
    entityType: 'Queue',
    entityId: created._id,
    after: { name, isDefault },
  });

  return String(created._id);
}

export async function updateQueue(id: string, input: QueueInput): Promise<void> {
  await connectToDatabase();

  const before = await queues().findById(id);
  if (!before) throw new Error('Queue not found.');

  const name = input.name.trim();
  if (!name) throw new Error('A queue needs a name.');

  const clash = await queues().findOne({ name, _id: { $ne: before._id } });
  if (clash) throw new Error(`There is already a queue called ${name}.`);

  if (input.isDefault) await clearDefault();

  await queues().updateOne(
    { _id: before._id },
    {
      $set: {
        name,
        description: input.description?.trim() || null,
        signature: input.signature?.trim() || null,
        productId: toOptionalObjectId(input.productId),
        memberIds: (input.memberIds ?? []).filter(Boolean).map((memberId) => toObjectId(memberId)),
        defaultAssigneeId: toOptionalObjectId(input.defaultAssigneeId),
        targets: validTargets(input.targets),
        isDefault: input.isDefault ?? before.isDefault,
      },
    },
  );

  await recordAudit({
    action: 'queue.updated',
    entityType: 'Queue',
    entityId: before._id,
    ...changedFields({ name: before.name }, { name }),
  });
}

/**
 * Archiving, not deleting.
 *
 * The last active queue cannot be archived, because a tenant with no queue cannot take a ticket,
 * and a support desk that silently stops accepting work is worse than one that refuses the change.
 */
export async function archiveQueue(id: string): Promise<void> {
  await connectToDatabase();

  const queue = await queues().findById(id);
  if (!queue) throw new Error('Queue not found.');

  const openTickets = await tickets().count({
    queueId: queue._id,
    status: { $nin: ['resolved', 'closed'] },
  });

  if (openTickets > 0) {
    throw new Error(
      `${queue.name} still holds ${openTickets} open ${openTickets === 1 ? 'ticket' : 'tickets'}. Move them to another queue first.`,
    );
  }

  const active = await queues().count({ status: 'active' });
  if (active <= 1) throw new Error('This is the last active queue, so it cannot be archived.');

  await queues().updateOne({ _id: queue._id }, { $set: { status: 'archived', isDefault: false } });

  await recordAudit({
    action: 'queue.archived',
    entityType: 'Queue',
    entityId: queue._id,
    before: { name: queue.name },
  });

  if (queue.isDefault) {
    const replacement = await queues().findOne({ status: 'active' });
    if (replacement)
      await queues().updateOne({ _id: replacement._id }, { $set: { isDefault: true } });
  }
}

export async function restoreQueue(id: string): Promise<void> {
  await connectToDatabase();

  const queue = await queues().findById(id);
  if (!queue) throw new Error('Queue not found.');

  await queues().updateOne({ _id: queue._id }, { $set: { status: 'active' } });
}

/** Where a ticket goes when nobody chose a queue. */
export async function defaultQueueId(): Promise<string | null> {
  await connectToDatabase();

  const found =
    (await queues().findOne({ isDefault: true, status: 'active' })) ??
    (await queues().findOne({ status: 'active' }));

  return found ? String(found._id) : null;
}

async function clearDefault(): Promise<void> {
  const current = await queues().find({ isDefault: true });

  for (const queue of current) {
    await queues().updateOne({ _id: queue._id }, { $set: { isDefault: false } });
  }
}

/**
 * Mongoose types a stored subdocument array as a DocumentArray, which a plain array satisfies at
 * runtime but not in the type system. The conversion is confined to this one function rather than
 * scattered through the writes.
 */
function asStored(targets: QueueTarget[]): Queue['targets'] {
  return targets as unknown as Queue['targets'];
}

function validTargets(targets: QueueTarget[] | undefined): QueueTarget[] {
  const filled = targetsOf(targets);

  for (const target of filled) {
    if (target.firstResponseMinutes <= 0 || target.resolutionMinutes <= 0) {
      throw new Error('A target of zero is not a promise. Give every priority a real target.');
    }

    if (target.resolutionMinutes < target.firstResponseMinutes) {
      throw new Error(
        `The ${target.priority} resolution target is shorter than its first response target, which cannot be met.`,
      );
    }
  }

  return filled;
}

/** For reading targets back out in a sentence: 240 working minutes reads as 4h. */
export function describeTarget(target: QueueTarget): string {
  return `${formatWorkingMinutes(target.firstResponseMinutes)} to first reply, ${formatWorkingMinutes(
    target.resolutionMinutes,
  )} to resolve`;
}
