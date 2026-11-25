import { effectiveModules } from '@coex/shared/core/modules';
import type { ClientSession } from 'mongoose';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { AuditLogModel } from '@coex/shared/core/models/audit-log.model';
import { positiveInteger } from '@coex/shared/core/saas';
import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { requirePlatformAdministrator } from './platform-access.service';

/** Invited staff reserve a seat; suspended/deleted staff and customer contacts do not. */
export const occupiedStaff = {
  role: { $ne: 'client_contact' as const },
  status: { $in: ['active', 'invited'] as const },
  deletedAt: null,
};

/** Every admission and plan change writes this document first, serialising concurrent counts. */
export async function lockSubscription(tenantId: string, session: ClientSession) {
  const tenant = await TenantModel.findOneAndUpdate(
    { _id: tenantId, deletedAt: null },
    { $inc: { seatRevision: 1 } },
    { session, returnDocument: 'after' },
  );
  if (!tenant) throw new Error('Workspace not found.');
  return tenant;
}

export async function assertStaffSeat(tenantId: string, session: ClientSession) {
  const tenant = await lockSubscription(tenantId, session);
  const limit = tenant.commercial?.seats;
  if (limit == null) return; // Existing tenants retain their allowance until configured.
  const used = await UserModel.countDocuments({ tenantId, ...occupiedStaff }).session(session);
  if (used >= limit)
    throw new Error(
      `All ${limit} staff seats are in use. Suspend a staff account or contact the platform owner.`,
    );
}

export async function subscriptionUsage() {
  await connectToDatabase();
  const { tenantId } = getContext();
  return {
    staff: await UserModel.countDocuments({ tenantId, ...occupiedStaff }),
    portal: await UserModel.countDocuments({ tenantId, role: 'client_contact', deletedAt: null }),
  };
}

/** Manual paid-access operations, deliberately independent of a payment provider. */
export async function setTenantSubscription(input: {
  tenantId: string;
  plan: string;
  seats: number;
  status: 'active' | 'past_due' | 'canceled';
  accessEndsAt: string;
  reason: string;
}) {
  await requirePlatformAdministrator();
  const plan = input.plan.trim();
  const reason = input.reason.trim();
  if (!plan || plan.length > 80) throw new Error('Enter a plan name of at most 80 characters.');
  if (!reason || reason.length > 500) throw new Error('Enter a reason of at most 500 characters.');
  positiveInteger(input.seats, 'Staff seats', 100000);
  if (!['active', 'past_due', 'canceled'].includes(input.status))
    throw new Error('Invalid subscription status.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.accessEndsAt)) throw new Error('Enter an access end date.');
  // Inclusive calendar date in UTC, visible as such in the owner UI.
  const end = new Date(`${input.accessEndsAt}T23:59:59.999Z`);
  if (!Number.isFinite(end.getTime()) || end.toISOString().slice(0, 10) !== input.accessEndsAt)
    throw new Error('Enter a valid access end date.');
  if (input.status === 'active' && end.getTime() <= Date.now())
    throw new Error('Active access must end in the future.');
  const db = await connectToDatabase();
  const context = getContext();
  await db.connection.transaction(async (session) => {
    const tenant = await lockSubscription(input.tenantId, session);
    const used = await UserModel.countDocuments({ tenantId: tenant._id, ...occupiedStaff }).session(
      session,
    );
    if (used > input.seats)
      throw new Error(
        `This workspace already uses ${used} staff seats. Suspend staff before reducing its allowance.`,
      );
    const after = { plan, seats: input.seats, status: input.status, accessEndsAt: end };
    await TenantModel.updateOne(
      { _id: tenant._id },
      {
        $set: {
          ...(tenant.commercial?.plan !== plan || tenant.commercial?.seats !== input.seats
            ? { 'commercial.planSnapshot': null, modules: effectiveModules(tenant) }
            : {}),
          'commercial.plan': plan,
          'commercial.seats': input.seats,
          'commercial.status': input.status,
          'commercial.accessEndsAt': end,
        },
      },
      { session },
    );
    await AuditLogModel.create(
      [
        {
          tenantId: context.tenantId,
          actorId: context.userId,
          action: 'tenant.subscription_updated',
          entityType: 'Tenant',
          entityId: tenant._id,
          before: tenant.commercial,
          after: { ...after, reason },
        },
      ],
      { session },
    );
  });
}
