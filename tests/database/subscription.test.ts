import { beforeAll, beforeEach, afterAll, it, expect, vi } from 'vitest';
import { Types } from 'mongoose';
import { connectForTests, clearDatabase, disconnectFromTests } from '../setup';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { AuditLogModel } from '@coex/shared/core/models/audit-log.model';
import { runWithContext, type RequestContext } from '@/lib/tenant-context';
import {
  setTenantSubscription,
  subscriptionUsage,
} from '@/modules/core/services/subscription.service';
import { createUser, setUserStatus } from '@/modules/core/services/user.service';
import { createSession } from '@/modules/core/services/session.service';
import { resolveAuthenticatedUser } from '@/modules/core/services/auth-context.service';
let context: RequestContext;
let target: Types.ObjectId;
beforeAll(() => connectForTests('subscription'));
beforeEach(async () => {
  await clearDatabase();
  const ownerTenant = await TenantModel.create({ name: 'Owner', slug: 'subscription-owner' });
  const owner = await UserModel.create({
    tenantId: ownerTenant._id,
    name: 'Owner',
    email: 'owner@example.test',
    role: 'platform_admin',
  });
  context = { tenantId: ownerTenant._id, userId: owner._id, isPlatformAdmin: true };
  const tenant = await TenantModel.create({ name: 'Company', slug: 'subscription-company' });
  target = tenant._id;
});
afterAll(disconnectFromTests);
const owner = <T>(fn: () => T) => runWithContext(context, fn);
const company = <T>(fn: () => T) =>
  runWithContext({ ...context, tenantId: target, isPlatformAdmin: false }, fn);
const save = (seats: number, status: 'active' | 'past_due' | 'canceled' = 'active') =>
  owner(() =>
    setTenantSubscription({
      tenantId: String(target),
      plan: 'Custom support',
      seats,
      status,
      accessEndsAt: '2030-01-31',
      reason: 'Manual agreement',
    }),
  );
const staff = (email: string) => company(() => createUser({ name: 'Staff', email, role: 'agent' }));
it('serialises concurrent staff creation at the last available seat', async () => {
  await save(1);
  const results = await Promise.allSettled([staff('one@example.test'), staff('two@example.test')]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(await UserModel.countDocuments({ tenantId: target, role: 'agent' })).toBe(1);
});
it('separates customer memberships and frees capacity on suspension', async () => {
  await save(1);
  await staff('one@example.test');
  await company(() =>
    createUser({ name: 'Customer', email: 'customer@example.test', role: 'client_contact' }),
  );
  await expect(staff('two@example.test')).rejects.toThrow(/staff seats/);
  const first = await UserModel.findOne({ tenantId: target, role: 'agent' });
  await company(() => setUserStatus(String(first!._id), 'suspended'));
  await staff('two@example.test');
  await expect(company(() => setUserStatus(String(first!._id), 'active'))).rejects.toThrow(
    /staff seats/,
  );
  expect(await company(subscriptionUsage)).toEqual({ staff: 1, portal: 1 });
});
it('counts invited staff and refuses a downgrade below occupied seats', async () => {
  await UserModel.create({
    tenantId: target,
    name: 'Invite',
    email: 'invite@example.test',
    role: 'agent',
    status: 'invited',
  });
  await save(2);
  await staff('one@example.test');
  await expect(save(1)).rejects.toThrow(/already uses 2/);
  expect((await TenantModel.findById(target))?.commercial?.seats).toBe(2);
});
it('keeps legacy allowances until configured and scopes usage to the tenant', async () => {
  await Promise.all([staff('one@example.test'), staff('two@example.test')]);
  expect(await company(subscriptionUsage)).toEqual({ staff: 2, portal: 0 });
  expect(await owner(subscriptionUsage)).toEqual({ staff: 1, portal: 0 });
});
it('blocks tenant admins and forged owner flags from subscription changes', async () => {
  await expect(
    company(() =>
      setTenantSubscription({
        tenantId: String(target),
        plan: 'Free',
        seats: 100,
        status: 'active',
        accessEndsAt: '2030-01-31',
        reason: 'Tampered',
      }),
    ),
  ).rejects.toThrow(/platform owner/);
  await UserModel.updateOne({ _id: context.userId }, { $set: { role: 'tenant_admin' } });
  await expect(save(2)).rejects.toThrow(/platform owner/);
});
it('rolls the subscription back if its audit cannot be written', async () => {
  const mock = vi.spyOn(AuditLogModel, 'create').mockRejectedValueOnce(new Error('Audit failed'));
  try {
    await expect(save(2)).rejects.toThrow('Audit failed');
  } finally {
    mock.mockRestore();
  }
  expect((await TenantModel.findById(target))?.commercial?.status).toBe('legacy');
});
it('updates existing sessions immediately for cancellation and manual renewal', async () => {
  await save(1);
  await staff('one@example.test');
  const user = await UserModel.findOne({ tenantId: target });
  // This test models an administrator who has completed activation/password setup.
  await UserModel.updateOne({ _id: user!._id }, { $set: { mustChangePassword: false } });
  const session = await createSession({ tenantId: target, userId: user!._id });
  expect((await resolveAuthenticatedUser(session.token))?.workspaceAccess).toBe('allowed');
  await save(1, 'canceled');
  expect((await resolveAuthenticatedUser(session.token))?.workspaceAccess).toBe(
    'subscription_expired',
  );
  await save(1);
  expect((await resolveAuthenticatedUser(session.token))?.workspaceAccess).toBe('allowed');
  expect(
    await AuditLogModel.countDocuments({ action: 'tenant.subscription_updated', entityId: target }),
  ).toBe(3);
});
it('rejects invalid dates, seats and missing reason', async () => {
  for (const override of [
    { seats: 0 },
    { accessEndsAt: '2030-02-30' },
    { reason: '' },
    { status: 'trialing' },
  ]) {
    await expect(
      owner(() =>
        setTenantSubscription({
          tenantId: String(target),
          plan: 'Support',
          seats: 2,
          status: 'active',
          accessEndsAt: '2030-01-31',
          reason: 'Agreement',
          ...override,
        } as Parameters<typeof setTenantSubscription>[0]),
      ),
    ).rejects.toThrow();
  }
});
