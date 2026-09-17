import type { Types } from 'mongoose';
import { AuditLogModel } from '../models/audit-log.model';
import { getContext, peekContext } from '@/lib/tenant-context';

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
