import type { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { toObjectId } from '@/lib/ids';
import { TicketModel } from '../models/ticket.model';
import { TicketReadModel } from '../models/ticket-read.model';

/**
 * The "something new here" mark on tickets and on the Support icon.
 *
 * Only the customer makes a ticket unread: a new email ticket, or their reply. Staff activity never
 * does, because a mark that also lights up for a colleague's internal note soon lights up for
 * everything and stops meaning anything.
 *
 * A mark is for the person who has to act: the assignee, and, while a ticket has no assignee,
 * everyone who can see the whole desk. Anyone else can open the ticket without being prompted to.
 */

const OPEN_STATUSES = ['new', 'open', 'pending_customer', 'escalated'] as const;

/** Opening a ticket counts as having seen everything on it so far. */
export async function markTicketRead(ticketId: string): Promise<void> {
  await connectToDatabase();
  const { tenantId, userId } = getContext();
  await TicketReadModel.updateOne(
    { tenantId, userId, ticketId: toObjectId(ticketId) },
    { $set: { readAt: new Date() } },
    { upsert: true },
  );
}

interface UnreadCandidate {
  _id: Types.ObjectId;
  assigneeId?: Types.ObjectId | null;
  customerActivityAt?: Date | null;
}

/** Which of these tickets carry a mark for the current person. */
export async function unreadAmong(found: UnreadCandidate[]): Promise<Set<string>> {
  const { tenantId, userId } = getContext();
  const candidates = found.filter(
    (ticket) =>
      ticket.customerActivityAt &&
      (!ticket.assigneeId || String(ticket.assigneeId) === String(userId)),
  );
  if (candidates.length === 0) return new Set();

  const reads = await TicketReadModel.find({
    tenantId,
    userId,
    ticketId: { $in: candidates.map((ticket) => ticket._id) },
  }).select('ticketId readAt');
  const readAt = new Map(reads.map((read) => [String(read.ticketId), read.readAt]));

  return new Set(
    candidates
      .filter((ticket) => {
        const seen = readAt.get(String(ticket._id));
        return !seen || seen < ticket.customerActivityAt!;
      })
      .map((ticket) => String(ticket._id)),
  );
}

/**
 * The number on the Support icon. Unassigned tickets count only for someone who can see the whole
 * desk, because an agent limited to their own tickets could not open them anyway.
 */
export async function countUnreadTickets(options: { includeUnassigned: boolean }): Promise<number> {
  await connectToDatabase();
  const { tenantId, userId } = getContext();

  const found = await TicketModel.find({
    tenantId,
    deletedAt: null,
    mergedIntoId: null,
    status: { $in: [...OPEN_STATUSES] },
    customerActivityAt: { $ne: null },
    assigneeId: options.includeUnassigned ? { $in: [userId, null] } : userId,
  })
    .select('_id assigneeId customerActivityAt')
    .lean<UnreadCandidate[]>();

  return (await unreadAmong(found)).size;
}
