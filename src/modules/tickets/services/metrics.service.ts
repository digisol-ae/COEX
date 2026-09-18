import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { toObjectId } from '@/lib/ids';
import { UserModel } from '@/modules/core/models/user.model';
import { TicketModel } from '../models/ticket.model';
import { QueueModel } from '../models/queue.model';
import type { TicketStatus } from './ticket.service';

/** Open means anything a person still has to deal with, named rather than defined by exclusion. */
const OPEN_STATUSES: TicketStatus[] = ['new', 'open', 'pending_customer', 'escalated'];

/**
 * How the desk is doing.
 *
 * Medians, not averages. One ticket that sat over a public holiday can drag an average past every
 * target while nine out of ten customers were answered in minutes, and a number that misleads in
 * both directions is worse than no number. The median says what the ordinary customer experienced;
 * the breach counts say how often the promise was missed. Between them there is nowhere to hide
 * and nothing to explain away.
 *
 * Every figure is in working minutes, on the same calendar the targets use, so a report cannot
 * disagree with the clock an agent watched on the ticket.
 */

const tickets = () => repository(TicketModel);

export interface DeskRow {
  id: string;
  name: string;
  resolved: number;
  open: number;
  firstResponseMet: number;
  firstResponseMissed: number;
  resolutionMet: number;
  resolutionMissed: number;
  medianFirstResponseMinutes: number | null;
  medianResolutionMinutes: number | null;
}

export interface DeskMetrics {
  from: Date;
  to: Date;
  totals: DeskRow;
  byAgent: DeskRow[];
  byQueue: DeskRow[];
  unassignedOpen: number;
  breachedOpen: number;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

interface Bucket {
  resolved: number;
  open: number;
  firstResponseMet: number;
  firstResponseMissed: number;
  resolutionMet: number;
  resolutionMissed: number;
  firstResponseMinutes: number[];
  resolutionMinutes: number[];
}

function emptyBucket(): Bucket {
  return {
    resolved: 0,
    open: 0,
    firstResponseMet: 0,
    firstResponseMissed: 0,
    resolutionMet: 0,
    resolutionMissed: 0,
    firstResponseMinutes: [],
    resolutionMinutes: [],
  };
}

function toRow(id: string, name: string, bucket: Bucket): DeskRow {
  return {
    id,
    name,
    resolved: bucket.resolved,
    open: bucket.open,
    firstResponseMet: bucket.firstResponseMet,
    firstResponseMissed: bucket.firstResponseMissed,
    resolutionMet: bucket.resolutionMet,
    resolutionMissed: bucket.resolutionMissed,
    medianFirstResponseMinutes: median(bucket.firstResponseMinutes),
    medianResolutionMinutes: median(bucket.resolutionMinutes),
  };
}

export async function loadDeskMetrics(input: {
  from: Date;
  to: Date;
  queueId?: string;
}): Promise<DeskMetrics> {
  await connectToDatabase();

  const query: Record<string, unknown> = {
    mergedIntoId: null,
    createdAt: { $gte: input.from, $lte: input.to },
  };

  if (input.queueId) query.queueId = toObjectId(input.queueId);

  const found = await tickets().find(query);

  const totals = emptyBucket();
  const byAgent = new Map<string, Bucket>();
  const byQueue = new Map<string, Bucket>();

  // Unowned work is counted under one heading rather than dropped, because "nobody" is the agent
  // with the worst queue in most support desks and hiding it helps nobody.
  const UNOWNED = 'unassigned';

  for (const ticket of found) {
    const agentKey = ticket.assigneeId ? String(ticket.assigneeId) : UNOWNED;
    const queueKey = String(ticket.queueId);

    const buckets = [
      totals,
      byAgent.get(agentKey) ?? byAgent.set(agentKey, emptyBucket()).get(agentKey)!,
      byQueue.get(queueKey) ?? byQueue.set(queueKey, emptyBucket()).get(queueKey)!,
    ];

    const isResolved = ['resolved', 'closed'].includes(ticket.status);

    for (const bucket of buckets) {
      if (isResolved) bucket.resolved += 1;
      else bucket.open += 1;

      if (ticket.firstRespondedAt) {
        if (ticket.firstResponseBreached) bucket.firstResponseMissed += 1;
        else bucket.firstResponseMet += 1;

        if (typeof ticket.firstResponseMinutes === 'number') {
          bucket.firstResponseMinutes.push(ticket.firstResponseMinutes);
        }
      }

      if (ticket.resolvedAt) {
        if (ticket.resolutionBreached) bucket.resolutionMissed += 1;
        else bucket.resolutionMet += 1;

        if (typeof ticket.resolutionMinutes === 'number') {
          bucket.resolutionMinutes.push(ticket.resolutionMinutes);
        }
      }
    }
  }

  const agentIds = [...byAgent.keys()].filter((key) => key !== UNOWNED);
  const queueIds = [...byQueue.keys()];

  const [users, queues] = await Promise.all([
    UserModel.find({ _id: { $in: agentIds } }).select('name'),
    QueueModel.find({ _id: { $in: queueIds } }).select('name'),
  ]);

  const userNames = new Map(users.map((user) => [String(user._id), user.name]));
  const queueNames = new Map(queues.map((queue) => [String(queue._id), queue.name]));

  const [unassignedOpen, breachedOpen] = await Promise.all([
    tickets().count({
      mergedIntoId: null,
      assigneeId: null,
      status: { $nin: ['resolved', 'closed'] },
    }),
    tickets().count({
      mergedIntoId: null,
      status: { $nin: ['resolved', 'closed'] },
      $or: [{ firstResponseBreached: true }, { resolutionBreached: true }],
    }),
  ]);

  return {
    from: input.from,
    to: input.to,
    totals: toRow('all', 'Everyone', totals),
    byAgent: [...byAgent.entries()]
      .map(([id, bucket]) =>
        toRow(id, id === UNOWNED ? 'Unassigned' : (userNames.get(id) ?? 'Unknown'), bucket),
      )
      .sort((a, b) => b.resolved - a.resolved || a.name.localeCompare(b.name)),
    byQueue: [...byQueue.entries()]
      .map(([id, bucket]) => toRow(id, queueNames.get(id) ?? 'Unknown queue', bucket))
      .sort((a, b) => b.open - a.open || a.name.localeCompare(b.name)),
    unassignedOpen,
    breachedOpen,
  };
}

/** A promise kept this often. Null when nothing was measured, which is not the same as zero. */
export function metPercent(met: number, missed: number): number | null {
  const total = met + missed;
  return total === 0 ? null : Math.round((met / total) * 100);
}

/** The same badge question for the support rail: how much open work is mine. */
export async function countMyOpenTickets(userId: string): Promise<number> {
  await connectToDatabase();

  return tickets().count({
    mergedIntoId: null,
    status: { $in: OPEN_STATUSES },
    assigneeId: toObjectId(userId),
  });
}

export interface DeskSnapshot {
  mine: number;
  unassigned: number;
  breached: number;
  dueSoon: number;
  pressing: {
    id: string;
    number: string;
    subject: string;
    dueAt: Date | null;
    isBreached: boolean;
  }[];
}

/**
 * The support half of the dashboard.
 *
 * Ordered by which promise runs out first rather than by age, because that is the only order that
 * tells someone what to open next. A ticket already past its target sorts to the top, since a
 * breach that nobody has noticed is the one that turns into a phone call.
 */
export async function loadDeskSnapshot(scope: { userId: string }): Promise<DeskSnapshot> {
  await connectToDatabase();

  const openFilter = { mergedIntoId: null, status: { $in: OPEN_STATUSES } };
  const soon = new Date(Date.now() + 4 * 60 * 60 * 1000);

  const [mine, unassigned, breached, dueSoon, pressing] = await Promise.all([
    tickets().count({ ...openFilter, assigneeId: toObjectId(scope.userId) }),
    tickets().count({ ...openFilter, assigneeId: null }),
    tickets().count({
      ...openFilter,
      $or: [{ firstResponseBreached: true }, { resolutionBreached: true }],
    }),
    tickets().count({
      ...openFilter,
      firstRespondedAt: null,
      firstResponseDueAt: { $lte: soon, $gte: new Date() },
    }),
    tickets()
      .find({ ...openFilter, assigneeId: toObjectId(scope.userId) })
      .sort({ firstResponseDueAt: 1, resolutionDueAt: 1 })
      .limit(5),
  ]);

  return {
    mine,
    unassigned,
    breached,
    dueSoon,
    pressing: pressing.map((ticket) => ({
      id: String(ticket._id),
      number: ticket.number,
      subject: ticket.subject,
      dueAt: ticket.firstRespondedAt
        ? (ticket.resolutionDueAt ?? null)
        : (ticket.firstResponseDueAt ?? null),
      isBreached: Boolean(ticket.firstResponseBreached || ticket.resolutionBreached),
    })),
  };
}
