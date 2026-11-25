import { beforeAll, beforeEach, afterAll, it, expect, vi } from 'vitest';
import { Types } from 'mongoose';
import { connectForTests, clearDatabase, disconnectFromTests } from '../setup';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { TaskModel } from '@coex/shared/tasks/models/task.model';
import { SpaceModel } from '@coex/shared/tasks/models/space.model';
import { TimeEntryModel } from '@coex/shared/time/models/time-entry.model';
import { EmailOutboxModel } from '@coex/shared/core/models/email-outbox.model';
import { AuditLogModel } from '@coex/shared/core/models/audit-log.model';
import { ActivityModel } from '@coex/shared/crm/models/activity.model';
import { runWithContext, type RequestContext } from '@/lib/tenant-context';
import { setTenantModules } from '@/modules/core/services/module-admin.service';
import {
  workspaceModules,
  assertModuleAccess,
} from '@/modules/core/services/module-access.service';
import { createTask, listTasks } from '@/modules/tasks/services/task.service';
import { listTickets } from '@/modules/tickets/services/ticket.service';
import { listContracts } from '@/modules/crm/services/contract.service';
import { createOrganisation, listOrganisations } from '@/modules/crm/services/organisation.service';
import { listTimeline } from '@/modules/crm/services/activity.service';
import { actorCan } from '@/modules/crm/services/access.service';
import { createSession } from '@/modules/core/services/session.service';
import { resolveAuthenticatedUser } from '@/modules/core/services/auth-context.service';
import { publicPortalTenant } from '@/modules/portal/tenant';
import { portalIdentity } from '@/modules/portal/service';
import { listResources } from '@/modules/resources/service';
import { loadDashboard } from '@/modules/tasks/services/dashboard.service';
import { loadMyWork } from '@/modules/tasks/services/my-work.service';
import { sendOpportunityRemindersForTenant } from '@/modules/crm/services/opportunity-reminder.service';
import { sendRenewalRemindersForTenant } from '@/modules/crm/services/contract-reminder.service';
import { deliverQueuedEmail } from '@/modules/core/services/email.service';
import { processPendingSupportInbound } from '@/modules/channels/services/support-inbound.service';
import {
  publishSubscriptionPlan,
  assignSubscriptionPlan,
  listSubscriptionPlans,
} from '@/modules/core/services/plan-catalogue.service';
import { startTimer, getRunningTimer } from '@/modules/time/services/time.service';
let context: RequestContext;
let target: Types.ObjectId;
const on = { tasks: true, tickets: true, crm: true };
const off = { tasks: false, tickets: false, crm: false };
const owner = <T>(fn: () => T) => runWithContext(context, fn);
const company = <T>(fn: () => T) =>
  runWithContext({ ...context, tenantId: target, isPlatformAdmin: false }, fn);
beforeAll(() => connectForTests('module_restrictions'));
beforeEach(async () => {
  await clearDatabase();
  const tenant = await TenantModel.create({
    name: 'Owner',
    slug: 'module-owner',
    storageUsedBytes: 0,
  });
  const user = await UserModel.create({
    tenantId: tenant._id,
    name: 'Owner',
    email: 'owner@module.test',
    role: 'platform_admin',
  });
  context = { tenantId: tenant._id, userId: user._id, isPlatformAdmin: true };
  target = (
    await TenantModel.create({ name: 'Company', slug: 'module-company', storageUsedBytes: 0 })
  )._id;
});
afterAll(disconnectFromTests);
it('defaults legacy tenants to all modules and resolves plan/tenant intersection', async () => {
  expect(await company(workspaceModules)).toEqual(on);
  await TenantModel.updateOne(
    { _id: target },
    {
      $set: {
        modules: { ...on, tasks: false },
        'commercial.planSnapshot': {
          code: 'support',
          version: 1,
          name: 'Support',
          currency: 'AED',
          amountMinor: 0,
          fractionDigits: 2,
          interval: 'month',
          seats: 5,
          storageLimitBytes: 2e9,
          modules: { ...on, crm: false },
        },
      },
    },
  );
  expect(await company(workspaceModules)).toEqual({ tasks: false, tickets: true, crm: false });
  await owner(() => setTenantModules(String(target), on, 'Enable allowed modules'));
  expect(await company(workspaceModules)).toEqual({ ...on, crm: false });
});
it('blocks service reads/writes and caller grants while retaining customer foundations', async () => {
  await owner(() => setTenantModules(String(target), off, 'Pause modules'));
  const denied: (() => Promise<unknown>)[] = [
    () => listTasks(),
    () => createTask({} as never),
    () => listTickets(),
    () => listContracts(),
    () => listResources(),
    () => portalIdentity(),
  ];
  for (const fn of denied) await expect(company(fn)).rejects.toThrow(/module is not available/);
  await company(() => createOrganisation({ name: 'Shared customer', kind: 'client' }));
  expect(await company(listOrganisations)).toHaveLength(1);
  expect(await owner(() => actorCan('task.manage'))).toBe(true);
  await owner(() => setTenantModules(String(context.tenantId), off, 'Restrict owner tenant too'));
  expect(await owner(() => actorCan('task.manage'))).toBe(false);
  expect(await TaskModel.countDocuments()).toBe(0);
});
it('filters permissions on an existing session and preserves explicit denials', async () => {
  const session = await createSession({ tenantId: context.tenantId, userId: context.userId });
  expect((await resolveAuthenticatedUser(session.token))?.permissions).toContain('task.manage');
  await owner(() => setTenantModules(String(context.tenantId), off, 'Disable'));
  const user = await resolveAuthenticatedUser(session.token);
  expect(user?.permissions).not.toContain('task.manage');
  expect(user?.permissions).not.toContain('ticket.manage');
  expect(user?.permissions).not.toContain('contract.read');
  expect(user?.permissions).toContain('customer.read');
  expect(user?.permissions).toContain('tenant.create');
  await owner(() => setTenantModules(String(context.tenantId), on, 'Restore'));
  await UserModel.updateOne(
    { _id: context.userId },
    { $set: { permissionDenials: ['task.manage'] } },
  );
  expect((await resolveAuthenticatedUser(session.token))?.permissions).not.toContain('task.manage');
});
it('refuses tenant admins, forged flags and invalid module payloads', async () => {
  await expect(company(() => setTenantModules(String(target), on, 'Tampered'))).rejects.toThrow(
    /platform owner/,
  );
  await expect(
    owner(() => setTenantModules(String(target), { tasks: 'false' } as never, 'Invalid')),
  ).rejects.toThrow(/allowance/);
  await UserModel.updateOne({ _id: context.userId }, { $set: { role: 'tenant_admin' } });
  await expect(owner(() => setTenantModules(String(target), on, 'Forged'))).rejects.toThrow(
    /platform owner/,
  );
});
it('hides disabled dashboard/combined work and portal entry', async () => {
  await owner(() => setTenantModules(String(target), off, 'Disable'));
  expect((await company(() => loadDashboard({}))).tiles.open).toBe(0);
  expect(
    await company(() => loadMyWork({ filter: 'all', seesTasks: true, seesTickets: true })),
  ).toEqual([]);
  expect(await publicPortalTenant('module-company')).toBeNull();
  expect(await company(getRunningTimer)).toBeNull();
  expect(await owner(workspaceModules)).toEqual(on);
});
it('filters disabled module activity from the shared customer timeline', async () => {
  const org = new Types.ObjectId();
  await ActivityModel.create(
    (['tasks', 'tickets', 'crm'] as const).map((sourceModule) => ({
      tenantId: target,
      organisationId: org,
      kind: 'note' as const,
      summary: sourceModule,
      sourceModule,
      sourceId: new Types.ObjectId(),
      actorId: context.userId,
    })),
  );
  await owner(() =>
    setTenantModules(String(target), { ...on, crm: false }, 'Support-only sales restriction'),
  );
  expect(
    (await company(() => listTimeline(String(org)))).map((x) => x.sourceModule).sort(),
  ).toEqual(['tasks', 'tickets']);
});
it('skips background work and defers already queued module email without consuming attempts', async () => {
  await owner(() => setTenantModules(String(target), off, 'Pause workers'));
  expect(await sendOpportunityRemindersForTenant(target)).toBe(0);
  expect(await sendRenewalRemindersForTenant(target)).toBe(0);
  expect(await company(processPendingSupportInbound)).toEqual({ processed: 0, failed: 0 });
  const mail = await EmailOutboxModel.create({
    tenantId: target,
    kind: 'ticket_reply',
    to: 'synthetic@example.test',
    subject: 'Pending',
    text: 'Pending',
  });
  expect(await deliverQueuedEmail()).toBe(0);
  const saved = await EmailOutboxModel.findById(mail._id);
  expect(saved?.status).toBe('pending');
  expect(saved?.attempts).toBe(0);
});
it('rolls module changes back when their audit fails', async () => {
  const mock = vi.spyOn(AuditLogModel, 'create').mockRejectedValueOnce(new Error('Audit failed'));
  try {
    await expect(owner(() => setTenantModules(String(target), off, 'Rollback'))).rejects.toThrow(
      'Audit failed',
    );
  } finally {
    mock.mockRestore();
  }
  expect(await company(workspaceModules)).toEqual(on);
});
it('snapshots restricted plans and does not let tenant switches bypass them', async () => {
  await owner(() =>
    publishSubscriptionPlan({
      code: 'support',
      version: 1,
      name: 'Support',
      price: '10',
      currency: 'AED',
      interval: 'month',
      seats: 5,
      storageLimitBytes: 2e9,
      reason: 'Support plan',
      modules: { tasks: false, tickets: true, crm: false },
    }),
  );
  const [plan] = await owner(listSubscriptionPlans);
  await owner(() =>
    assignSubscriptionPlan({
      tenantId: String(target),
      planId: plan.id,
      accessEndsAt: '2030-01-31',
      reason: 'Agreed',
    }),
  );
  await expect(company(() => assertModuleAccess('tasks'))).rejects.toThrow(/not available/);
  expect(await company(workspaceModules)).toEqual({ tasks: false, tickets: true, crm: false });
  expect(await owner(workspaceModules)).toEqual(on);
});
it('serialises disabling tasks against a concurrent timer start', async () => {
  const space = await SpaceModel.create({ tenantId: target, name: 'Work' });
  const task = await TaskModel.create({
    tenantId: target,
    spaceId: space._id,
    number: 'T-1',
    title: 'Work',
    status: 'To do',
  });
  await Promise.allSettled([
    company(() => startTimer(String(task._id))),
    owner(() => setTenantModules(String(target), { ...on, tasks: false }, 'Race')),
  ]);
  const modules = await company(workspaceModules);
  const timers = await TimeEntryModel.countDocuments({ tenantId: target, running: true });
  expect(modules.tasks || timers === 0).toBe(true);
});
it('keeps restrictions when a manual seat adjustment replaces an assigned snapshot', async () => {
  const { setTenantSubscription } = await import('@/modules/core/services/subscription.service');
  await owner(() =>
    publishSubscriptionPlan({
      code: 'restricted',
      version: 1,
      name: 'Restricted',
      price: '10',
      currency: 'AED',
      interval: 'month',
      seats: 5,
      storageLimitBytes: 2e9,
      reason: 'Restricted',
      modules: { tasks: false, tickets: true, crm: false },
    }),
  );
  const [plan] = await owner(listSubscriptionPlans);
  await owner(() =>
    assignSubscriptionPlan({
      tenantId: String(target),
      planId: plan.id,
      accessEndsAt: '2030-01-31',
      reason: 'Assign',
    }),
  );
  await owner(() =>
    setTenantSubscription({
      tenantId: String(target),
      plan: 'Custom',
      seats: 6,
      status: 'active',
      accessEndsAt: '2030-01-31',
      reason: 'Custom seats',
    }),
  );
  expect(await company(workspaceModules)).toEqual({ tasks: false, tickets: true, crm: false });
});
