import { beforeAll, beforeEach, afterAll, it, expect, vi } from 'vitest';
import { Types } from 'mongoose';
import { connectForTests, clearDatabase, disconnectFromTests } from '../setup';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { SubscriptionPlanModel } from '@coex/shared/core/models/subscription-plan.model';
import { AuditLogModel } from '@coex/shared/core/models/audit-log.model';
import { runWithContext, type RequestContext } from '@/lib/tenant-context';
import {
  assignSubscriptionPlan,
  archiveSubscriptionPlan,
  publishSubscriptionPlan,
  listSubscriptionPlans,
  priceTerms,
} from '@/modules/core/services/plan-catalogue.service';
import { setTenantSubscription } from '@/modules/core/services/subscription.service';
let context: RequestContext;
let target: Types.ObjectId;
beforeAll(() => connectForTests('plan_catalogue'));
beforeEach(async () => {
  await clearDatabase();
  const tenant = await TenantModel.create({
    name: 'Owner',
    slug: 'catalogue-owner',
    storageUsedBytes: 0,
  });
  const user = await UserModel.create({
    tenantId: tenant._id,
    name: 'Owner',
    email: 'owner@catalogue.test',
    role: 'platform_admin',
  });
  context = { tenantId: tenant._id, userId: user._id, isPlatformAdmin: true };
  target = (
    await TenantModel.create({ name: 'Company', slug: 'catalogue-company', storageUsedBytes: 0 })
  )._id;
});
afterAll(disconnectFromTests);
const owner = <T>(fn: () => T) => runWithContext(context, fn);
const base = {
  code: 'support',
  version: 1,
  name: 'Support',
  price: '49.95',
  currency: 'AED',
  interval: 'month',
  seats: 3,
  storageLimitBytes: 2_000_000_000,
  reason: 'Initial terms',
};
async function publish(overrides: Partial<typeof base> = {}) {
  await owner(() => publishSubscriptionPlan({ ...base, ...overrides }));
  return (await SubscriptionPlanModel.findOne({
    code: overrides.code ?? base.code,
    version: overrides.version ?? 1,
  }))!;
}
const assign = (planId: string) =>
  owner(() =>
    assignSubscriptionPlan({
      tenantId: String(target),
      planId,
      accessEndsAt: '2030-01-31',
      reason: 'Agreed terms',
    }),
  );
it('stores exact currency amounts and rejects unsupported precision or currency', () => {
  expect(priceTerms('49.95', 'AED')).toEqual({ amountMinor: 4995, fractionDigits: 2 });
  expect(priceTerms('99', 'JPY')).toEqual({ amountMinor: 99, fractionDigits: 0 });
  expect(priceTerms('1.234', 'KWD')).toEqual({ amountMinor: 1234, fractionDigits: 3 });
  for (const [price, currency] of [
    ['1.001', 'AED'],
    ['-1', 'AED'],
    ['1.0', 'JPY'],
    ['1e2', 'USD'],
    ['1', 'XYZ'],
  ])
    expect(() => priceTerms(price, currency)).toThrow();
});
it('publishes immutable unique versions with audit and never changes assigned snapshots', async () => {
  const first = await publish();
  await assign(String(first._id));
  await expect(publish({ price: '100' })).rejects.toThrow(/already exists/);
  await publish({ version: 2, price: '99', seats: 10 });
  const tenant = await TenantModel.findById(target);
  expect(tenant?.commercial?.planSnapshot?.amountMinor).toBe(4995);
  expect(tenant?.commercial?.planSnapshot?.version).toBe(1);
  expect(tenant?.commercial?.seats).toBe(3);
  expect(await owner(listSubscriptionPlans)).toHaveLength(2);
  expect(await AuditLogModel.countDocuments({ action: 'plan.published' })).toBe(2);
});
it('sets seats, storage, price snapshot and paid expiry together', async () => {
  const plan = await publish();
  await assign(String(plan._id));
  const tenant = await TenantModel.findById(target);
  expect(tenant?.storageLimitBytes).toBe(base.storageLimitBytes);
  expect(tenant?.commercial?.status).toBe('active');
  expect(tenant?.commercial?.accessEndsAt?.toISOString()).toBe('2030-01-31T23:59:59.999Z');
  expect(tenant?.commercial?.planSnapshot?.interval).toBe('month');
});
it('archives without affecting an existing tenant and blocks new assignment', async () => {
  const plan = await publish();
  await assign(String(plan._id));
  await owner(() => archiveSubscriptionPlan(String(plan._id), 'Revised offer'));
  await expect(assign(String(plan._id))).rejects.toThrow(/active plan/);
  expect((await TenantModel.findById(target))?.commercial?.planSnapshot?.version).toBe(1);
});
it('rejects downgrades below staff and storage usage without partial updates', async () => {
  const plan = await publish({ seats: 1, storageLimitBytes: 100 });
  await UserModel.create([
    { tenantId: target, name: 'One', email: 'one@catalogue.test', role: 'agent' },
    {
      tenantId: target,
      name: 'Two',
      email: 'two@catalogue.test',
      role: 'agent',
      status: 'invited',
    },
  ]);
  await expect(assign(String(plan._id))).rejects.toThrow(/staff seats/);
  await UserModel.updateMany({ tenantId: target }, { $set: { status: 'suspended' } });
  await TenantModel.updateOne({ _id: target }, { $set: { storageUsedBytes: 101 } });
  await expect(assign(String(plan._id))).rejects.toThrow(/current usage/);
  expect((await TenantModel.findById(target))?.commercial?.status).toBe('legacy');
});
it('rolls back publishing and assignment if audit fails', async () => {
  let audit = vi.spyOn(AuditLogModel, 'create').mockRejectedValueOnce(new Error('Audit failed'));
  try {
    await expect(publish()).rejects.toThrow('Audit failed');
  } finally {
    audit.mockRestore();
  }
  expect(await SubscriptionPlanModel.countDocuments()).toBe(0);
  const plan = await publish();
  audit = vi.spyOn(AuditLogModel, 'create').mockRejectedValueOnce(new Error('Audit failed'));
  try {
    await expect(assign(String(plan._id))).rejects.toThrow('Audit failed');
  } finally {
    audit.mockRestore();
  }
  expect((await TenantModel.findById(target))?.commercial?.planSnapshot).toBeNull();
});
it('rejects tenant administrators and forged owner flags', async () => {
  const plan = await publish();
  await expect(
    runWithContext({ ...context, isPlatformAdmin: false }, () => publishSubscriptionPlan(base)),
  ).rejects.toThrow(/platform owner/);
  await UserModel.updateOne({ _id: context.userId }, { $set: { role: 'tenant_admin' } });
  await expect(assign(String(plan._id))).rejects.toThrow(/platform owner/);
  await expect(owner(() => archiveSubscriptionPlan(String(plan._id), 'Test'))).rejects.toThrow(
    /platform owner/,
  );
  await expect(owner(listSubscriptionPlans)).rejects.toThrow(/platform owner/);
});
it('preserves the snapshot on manual renewal but detaches it when custom terms replace it', async () => {
  const plan = await publish();
  await assign(String(plan._id));
  const update = {
    tenantId: String(target),
    plan: base.name,
    seats: base.seats,
    status: 'active' as const,
    accessEndsAt: '2031-01-31',
    reason: 'Renewal',
  };
  await owner(() => setTenantSubscription(update));
  expect((await TenantModel.findById(target))?.commercial?.planSnapshot?.version).toBe(1);
  await owner(() => setTenantSubscription({ ...update, seats: 5 }));
  expect((await TenantModel.findById(target))?.commercial?.planSnapshot).toBeNull();
});
it('rejects invalid versions, limits, dates and missing reasons', async () => {
  for (const override of [
    { version: 0 },
    { seats: 0 },
    { storageLimitBytes: 0 },
    { interval: 'week' },
    { reason: '' },
  ])
    await expect(publish(override)).rejects.toThrow();
  const plan = await publish();
  await expect(
    owner(() =>
      assignSubscriptionPlan({
        tenantId: String(target),
        planId: String(plan._id),
        accessEndsAt: '2030-02-30',
        reason: 'Invalid',
      }),
    ),
  ).rejects.toThrow(/date/);
});
