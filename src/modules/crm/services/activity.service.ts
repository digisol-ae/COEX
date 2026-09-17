import type { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { repository } from '@/lib/repository';
import { ActivityModel } from '../models/activity.model';
import { UserModel } from '@/modules/core/models/user.model';
import { toObjectId, toOptionalObjectId } from '@/lib/ids';

/**
 * The single timeline.
 *
 * Tickets, Tasks and the XVERSE connector all call recordActivity rather than keeping their own
 * history, which is what lets one customer screen show everything that has ever happened with that
 * client. Nothing here deletes an entry.
 */

const activities = () => repository(ActivityModel);

export type ActivityKind =
  | 'note'
  | 'call'
  | 'meeting'
  | 'email'
  | 'whatsapp'
  | 'ticket_opened'
  | 'ticket_replied'
  | 'ticket_resolved'
  | 'task_created'
  | 'task_completed'
  | 'document_shared';

export interface ActivityInput {
  organisationId: string | Types.ObjectId;
  contactId?: string | Types.ObjectId | null;
  locationId?: string | Types.ObjectId | null;
  kind: ActivityKind;
  direction?: 'inbound' | 'outbound' | 'internal';
  summary: string;
  body?: string | null;
  sourceModule?: 'crm' | 'tickets' | 'tasks' | 'xverse' | 'email';
  sourceId?: string | Types.ObjectId | null;
  occurredAt?: Date;
}

export async function recordActivity(input: ActivityInput): Promise<void> {
  await connectToDatabase();

  const { userId } = getContext();

  await activities().create({
    organisationId: toObjectId(input.organisationId),
    contactId: toOptionalObjectId(input.contactId),
    locationId: toOptionalObjectId(input.locationId),
    kind: input.kind,
    direction: input.direction ?? 'internal',
    summary: input.summary.trim(),
    body: input.body?.trim() || null,
    sourceModule: input.sourceModule ?? 'crm',
    sourceId: toOptionalObjectId(input.sourceId),
    actorId: userId,
    occurredAt: input.occurredAt ?? new Date(),
  });
}

export interface TimelineEntry {
  id: string;
  kind: ActivityKind;
  direction: string;
  summary: string;
  body: string | null;
  sourceModule: string;
  actorName: string;
  occurredAt: Date;
}

export async function listTimeline(organisationId: string, limit = 50): Promise<TimelineEntry[]> {
  await connectToDatabase();

  const entries = await activities().find({ organisationId }).sort({ occurredAt: -1 }).limit(limit);

  const actorIds = [...new Set(entries.map((entry) => String(entry.actorId)).filter(Boolean))];
  const actors = await UserModel.find({ _id: { $in: actorIds } }).select('name');
  const names = new Map(actors.map((actor) => [String(actor._id), actor.name]));

  return entries.map((entry) => ({
    id: String(entry._id),
    kind: entry.kind as ActivityKind,
    direction: entry.direction ?? 'internal',
    summary: entry.summary,
    body: entry.body ?? null,
    sourceModule: entry.sourceModule ?? 'crm',
    actorName: names.get(String(entry.actorId)) ?? 'System',
    occurredAt: entry.occurredAt ?? entry.createdAt,
  }));
}
