import type { Types } from 'mongoose';
import { AuditLogModel } from '../models/audit-log.model';
import { UserModel } from '../models/user.model';
import { getContext, peekContext } from '@/lib/tenant-context';
import { toObjectId } from '@/lib/ids';

/**
 * The single place an audit entry is written.
 *
 * Services call recordAudit after a successful mutation. Scattering audit writes across the code
 * base is how gaps appear, so every module routes through here.
 */

export interface AuditInput {
  action: string;
  entityType: string;
  entityId?: Types.ObjectId | null;
  before?: unknown;
  after?: unknown;
  actorEmail?: string | null;
  ipAddress?: string | null;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  const context = getContext();

  await AuditLogModel.create({
    tenantId: context.tenantId,
    actorId: context.userId,
    actorEmail: input.actorEmail ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
    ipAddress: input.ipAddress ?? null,
    at: new Date(),
  });
}

/**
 * Audit for events that happen before a session exists, such as a failed sign in attempt. The
 * tenant is passed explicitly because there is no request context yet.
 */
export async function recordUnauthenticatedAudit(
  tenantId: Types.ObjectId,
  input: AuditInput,
): Promise<void> {
  await AuditLogModel.create({
    tenantId,
    actorId: peekContext()?.userId ?? null,
    actorEmail: input.actorEmail ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
    ipAddress: input.ipAddress ?? null,
    at: new Date(),
  });
}

/** Keeps the log small and readable: only the fields that actually changed. */
export function changedFields<T extends Record<string, unknown>>(
  before: T,
  after: T,
): { before: Partial<T>; after: Partial<T> } {
  const beforeChanges: Partial<T> = {};
  const afterChanges: Partial<T> = {};

  for (const key of new Set([...Object.keys(before), ...Object.keys(after)]) as Set<keyof T>) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      beforeChanges[key] = before[key];
      afterChanges[key] = after[key];
    }
  }

  return { before: beforeChanges, after: afterChanges };
}

export interface AuditHistoryRow {
  id: string;
  action: string;
  at: Date;
  actorName: string;
  changes: { field: string; from: unknown; to: unknown }[];
}

/**
 * The history of one record, in the order it happened.
 *
 * A log nobody can find is a log nobody trusts. An audit trail that only exists on a separate
 * administrative screen answers "what happened across the tenant" and never "why does this row say
 * ninety minutes when I remember two hours", which is the question people actually ask. So the
 * history of a single record is readable from the record itself.
 *
 * Reads only. Nothing in the product edits or deletes an audit entry.
 */
export async function historyFor(
  entityType: string,
  entityId: string,
  limit = 20,
): Promise<AuditHistoryRow[]> {
  const { tenantId } = getContext();

  const rows = await AuditLogModel.find({
    tenantId,
    entityType,
    entityId: toObjectId(entityId),
  })
    .sort({ at: 1 })
    .limit(limit);

  const actorIds = [
    ...new Set(rows.filter((row) => row.actorId).map((row) => String(row.actorId))),
  ];

  const actors = await UserModel.find({ _id: { $in: actorIds } }).select('name');
  const names = new Map(actors.map((actor) => [String(actor._id), actor.name]));

  return rows.map((row) => {
    const before = (row.before ?? {}) as Record<string, unknown>;
    const after = (row.after ?? {}) as Record<string, unknown>;

    const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])];

    return {
      id: String(row._id),
      action: row.action,
      at: row.at,
      actorName: row.actorId
        ? (names.get(String(row.actorId)) ?? row.actorEmail ?? 'Unknown')
        : (row.actorEmail ?? 'The system'),
      changes: fields.map((field) => ({ field, from: before[field], to: after[field] })),
    };
  });
}
