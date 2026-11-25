import { assertNoStrandedTimers } from './module-admin.service';
import { effectiveModules } from '@coex/shared/core/modules';
import { ALL_MODULES, type ModuleAllowance } from '@coex/shared/core/modules';
import { SubscriptionPlanModel } from '@coex/shared/core/models/subscription-plan.model';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { AuditLogModel } from '@coex/shared/core/models/audit-log.model';
import { positiveInteger } from '@coex/shared/core/saas';
import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { initialiseStorageUsage } from '@/lib/storage';
import { requirePlatformAdministrator } from './platform-access.service';
import { lockSubscription, occupiedStaff } from './subscription.service';
import { UserModel } from '@coex/shared/core/models/user.model';

export function priceTerms(price: string, currency: string) {
  if (!Intl.supportedValuesOf('currency').includes(currency))
    throw new Error('Choose a supported currency code.');
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
    .maximumFractionDigits!;
  if (!/^\d{1,10}(\.\d{1,4})?$/.test(price) || (price.split('.')[1]?.length ?? 0) > digits)
    throw new Error(
      `Enter a non-negative price with at most ${digits} decimal places for ${currency}.`,
    );
  const [whole, fraction = ''] = price.split('.');
  const amountMinor = Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, '0'));
  if (!Number.isSafeInteger(amountMinor)) throw new Error('That price is too large.');
  return { amountMinor, fractionDigits: digits };
}
export async function listSubscriptionPlans() {
  await requirePlatformAdministrator();
  return (await SubscriptionPlanModel.find({}).sort({ code: 1, version: -1 }).lean()).map((p) => ({
    id: String(p._id),
    modules: { ...ALL_MODULES, ...p.modules },
    code: p.code,
    version: p.version,
    name: p.name,
    currency: p.currency,
    amountMinor: p.amountMinor,
    fractionDigits: p.fractionDigits,
    interval: p.interval,
    seats: p.seats,
    storageLimitBytes: p.storageLimitBytes,
    active: p.active,
  }));
}
export type PlanOption = Awaited<ReturnType<typeof listSubscriptionPlans>>[number];
export async function publishSubscriptionPlan(input: {
  modules?: ModuleAllowance;
  code: string;
  version: number;
  name: string;
  currency: string;
  price: string;
  interval: string;
  seats: number;
  storageLimitBytes: number;
  reason: string;
}) {
  await requirePlatformAdministrator();
  const code = input.code.trim().toLowerCase();
  const name = input.name.trim();
  const reason = input.reason.trim();
  const currency = input.currency.trim().toUpperCase();
  if (!/^[a-z0-9-]{2,40}$/.test(code))
    throw new Error('Use 2–40 letters, numbers or hyphens for the plan code.');
  if (!name || name.length > 80) throw new Error('Enter a plan name of at most 80 characters.');
  if (!reason || reason.length > 500) throw new Error('Enter a reason of at most 500 characters.');
  positiveInteger(input.version, 'Version', 100000);
  positiveInteger(input.seats, 'Staff seats', 100000);
  positiveInteger(input.storageLimitBytes, 'Storage bytes');
  if (input.interval !== 'month' && input.interval !== 'year')
    throw new Error('Choose monthly or annual billing.');
  if (
    input.modules &&
    (Object.keys(input.modules).some((key) => !['tasks', 'tickets', 'crm'].includes(key)) ||
      ['tasks', 'tickets', 'crm'].some(
        (key) => typeof input.modules?.[key as keyof ModuleAllowance] !== 'boolean',
      ))
  )
    throw new Error('Choose a valid allowance for each module.');
  const terms = {
    modules: input.modules ?? ALL_MODULES,
    code,
    version: input.version,
    name,
    currency,
    ...priceTerms(input.price.trim(), currency),
    interval: input.interval as 'month' | 'year',
    seats: input.seats,
    storageLimitBytes: input.storageLimitBytes,
  };
  const db = await connectToDatabase();
  const context = getContext();
  if (await SubscriptionPlanModel.exists({ code, version: input.version }))
    throw new Error('That plan version already exists. Publish a new version.');
  await db.connection.transaction(async (session) => {
    const [plan] = await SubscriptionPlanModel.create([terms], { session });
    await AuditLogModel.create(
      [
        {
          tenantId: context.tenantId,
          actorId: context.userId,
          action: 'plan.published',
          entityType: 'SubscriptionPlan',
          entityId: plan._id,
          after: { ...terms, reason },
        },
      ],
      { session },
    );
  });
}
export async function archiveSubscriptionPlan(id: string, reason: string) {
  await requirePlatformAdministrator();
  if (!reason.trim() || reason.length > 500)
    throw new Error('Enter a reason of at most 500 characters.');
  const db = await connectToDatabase();
  const context = getContext();
  await db.connection.transaction(async (session) => {
    const plan = await SubscriptionPlanModel.findOneAndUpdate(
      { _id: id, active: true },
      { $set: { active: false } },
      { session },
    );
    if (!plan) throw new Error('Plan is missing or already archived.');
    await AuditLogModel.create(
      [
        {
          tenantId: context.tenantId,
          actorId: context.userId,
          action: 'plan.archived',
          entityType: 'SubscriptionPlan',
          entityId: plan._id,
          after: { code: plan.code, version: plan.version, reason: reason.trim() },
        },
      ],
      { session },
    );
  });
}
export async function assignSubscriptionPlan(input: {
  tenantId: string;
  planId: string;
  accessEndsAt: string;
  reason: string;
}) {
  await requirePlatformAdministrator();
  if (!input.reason.trim() || input.reason.length > 500)
    throw new Error('Enter a reason of at most 500 characters.');
  const end = new Date(`${input.accessEndsAt}T23:59:59.999Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(input.accessEndsAt) ||
    !Number.isFinite(end.getTime()) ||
    end.toISOString().slice(0, 10) !== input.accessEndsAt ||
    end.getTime() <= Date.now()
  )
    throw new Error('Enter a valid future access end date.');
  await initialiseStorageUsage(input.tenantId);
  const db = await connectToDatabase();
  const context = getContext();
  await db.connection.transaction(async (session) => {
    const tenant = await lockSubscription(input.tenantId, session);
    // A write makes archive and assignment serialize rather than trusting a stale active read.
    const plan = await SubscriptionPlanModel.findOneAndUpdate(
      { _id: input.planId, active: true },
      { $inc: { assignmentRevision: 1 } },
      { session, returnDocument: 'after' },
    );
    if (!plan) throw new Error('Choose an active plan version.');
    const used = await UserModel.countDocuments({ tenantId: tenant._id, ...occupiedStaff }).session(
      session,
    );
    if (used > plan.seats)
      throw new Error(
        `This workspace uses ${used} staff seats. Choose a larger plan or suspend staff first.`,
      );
    if ((tenant.storageUsedBytes ?? 0) > plan.storageLimitBytes)
      throw new Error('Plan storage cannot be lower than current usage.');
    const snapshot = {
      modules: { ...ALL_MODULES, ...plan.modules },
      code: plan.code,
      version: plan.version,
      name: plan.name,
      currency: plan.currency,
      amountMinor: plan.amountMinor,
      fractionDigits: plan.fractionDigits,
      interval: plan.interval,
      seats: plan.seats,
      storageLimitBytes: plan.storageLimitBytes,
    };
    await assertNoStrandedTimers(
      String(tenant._id),
      effectiveModules({ modules: tenant.modules, commercial: { planSnapshot: snapshot } }),
      session,
    );
    await TenantModel.updateOne(
      { _id: tenant._id },
      {
        $set: {
          'commercial.plan': plan.name,
          'commercial.seats': plan.seats,
          'commercial.status': 'active',
          'commercial.accessEndsAt': end,
          'commercial.planSnapshot': snapshot,
          storageLimitBytes: plan.storageLimitBytes,
        },
      },
      { session },
    );
    await AuditLogModel.create(
      [
        {
          tenantId: context.tenantId,
          actorId: context.userId,
          action: 'tenant.plan_assigned',
          entityType: 'Tenant',
          entityId: tenant._id,
          before: { commercial: tenant.commercial, storageLimitBytes: tenant.storageLimitBytes },
          after: { snapshot, accessEndsAt: end, reason: input.reason.trim() },
        },
      ],
      { session },
    );
  });
}
