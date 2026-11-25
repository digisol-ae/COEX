import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { SessionModel } from '@coex/shared/core/models/session.model';
import { QueueModel } from '@coex/shared/tickets/models/queue.model';
import { AuditLogModel } from '@coex/shared/core/models/audit-log.model';
import { fileStorage, initialiseStorageUsage } from '@/lib/storage';
import { runWithContext, type RequestContext } from '@/lib/tenant-context';
import { createSession } from '@/modules/core/services/session.service';
import { resolveAuthenticatedUser } from '@/modules/core/services/auth-context.service';
import {
  createTenant,
  extendTenantTrial,
  listTenants,
  setTenantStorageLimit,
} from '@/modules/core/services/tenant.service';
import { updateProvisioningDefaults } from '@/modules/core/services/platform-settings.service';
import { assertWorkspaceAccess } from '@/modules/core/services/workspace-access.service';
import { createUser, updateUserRole } from '@/modules/core/services/user.service';
import { DAY_MS } from '@coex/shared/core/saas';
import { TicketMessageModel } from '@coex/shared/tickets/models/ticket-message.model';
import { attachToMessage } from '@/modules/tickets/services/attachment.service';

let tenantId: Types.ObjectId;
let actorId: Types.ObjectId;
let context: RequestContext;
const directories: string[] = [];
beforeAll(async () => {
  await connectForTests('saas');
});
beforeEach(async () => {
  await clearDatabase();
  const tenant = await TenantModel.create({
    name: 'SaaS test',
    slug: 'saas-test',
    storageLimitBytes: 10,
  });
  tenantId = tenant._id;
  const actor = await UserModel.create({
    tenantId,
    name: 'Owner',
    email: 'owner@example.test',
    role: 'platform_admin',
  });
  actorId = actor._id;
  context = { tenantId, userId: actorId, isPlatformAdmin: true };
  directories.push(join(process.env.STORAGE_DIR!, String(tenantId)));
});
afterAll(async () => {
  await Promise.all(directories.map((path) => rm(path, { recursive: true, force: true })));
  await disconnectFromTests();
});
const asOwner = <T>(work: () => T) => runWithContext(context, work);
const put = (bytes: number) =>
  asOwner(() =>
    fileStorage().put({
      tenantId: String(tenantId),
      fileName: 'test.txt',
      contentType: 'text/plain',
      body: Buffer.alloc(bytes),
    }),
  );

describe('tenant storage quotas', () => {
  it('releases a reservation when the filesystem write fails', async () => {
    const now = new Date();
    const path = join(process.env.STORAGE_DIR!, String(tenantId));
    await mkdir(path, { recursive: true });
    await writeFile(
      join(path, `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`),
      Buffer.alloc(0),
    );
    await expect(put(8)).rejects.toThrow();
    expect((await TenantModel.findById(tenantId))?.storageUsedBytes).toBe(0);
  });
  it('rolls back a partially uploaded ticket attachment batch at the quota boundary', async () => {
    const message = await TicketMessageModel.create({
      tenantId,
      ticketId: new Types.ObjectId(),
      visibility: 'internal',
      direction: 'outbound',
      body: 'Test',
      authorName: 'Owner',
    });
    await expect(
      asOwner(() =>
        attachToMessage(String(message._id), [
          { fileName: 'one.txt', contentType: 'text/plain', body: Buffer.alloc(6) },
          { fileName: 'two.txt', contentType: 'text/plain', body: Buffer.alloc(6) },
        ]),
      ),
    ).rejects.toThrow(/storage limit/);
    expect((await TenantModel.findById(tenantId))?.storageUsedBytes).toBe(0);
    expect((await TicketMessageModel.findById(message._id))?.attachments).toHaveLength(0);
    await put(10);
  });
  it('counts existing physical files before accepting the first upload', async () => {
    const path = join(process.env.STORAGE_DIR!, String(tenantId));
    await mkdir(path, { recursive: true });
    await writeFile(join(path, 'existing.txt'), Buffer.alloc(8));
    expect(await initialiseStorageUsage(String(tenantId))).toBe(8);
    await expect(put(3)).rejects.toThrow(/storage limit/);
    await put(2);
    expect((await TenantModel.findById(tenantId))?.storageUsedBytes).toBe(10);
  });
  it('atomically rejects a racing upload that would exceed the quota', async () => {
    const results = await Promise.allSettled([put(6), put(6)]);
    expect(results.filter((row) => row.status === 'fulfilled')).toHaveLength(1);
    expect((await TenantModel.findById(tenantId))?.storageUsedBytes).toBe(6);
  });
  it('returns capacity once even when two removers race', async () => {
    const file = await put(8);
    await asOwner(() =>
      Promise.all([fileStorage().remove(file.key), fileStorage().remove(file.key)]),
    );
    expect((await TenantModel.findById(tenantId))?.storageUsedBytes).toBe(0);
    await put(10);
  });
  it('blocks cross-tenant keys and rejects lowering the allowance below usage', async () => {
    const file = await put(8);
    await expect(
      runWithContext({ ...context, tenantId: new Types.ObjectId() }, () =>
        fileStorage().get(file.key),
      ),
    ).rejects.toThrow(/another workspace/);
    await expect(
      asOwner(() => setTenantStorageLimit(String(tenantId), 7, 'Lower plan')),
    ).rejects.toThrow(/current usage/);
    await asOwner(() => setTenantStorageLimit(String(tenantId), 20, 'Purchased extra storage'));
    await put(12);
  });
});

describe('trial and platform boundaries', () => {
  it('rolls provisioning back if the default queue cannot be created', async () => {
    const queue = vi.spyOn(QueueModel, 'create').mockRejectedValueOnce(new Error('Queue failed'));
    try {
      await expect(
        asOwner(() =>
          createTenant({
            name: 'Rollback',
            slug: 'rollback',
            adminName: 'Admin',
            adminEmail: 'rollback@example.test',
          }),
        ),
      ).rejects.toThrow('Queue failed');
      expect(await TenantModel.countDocuments({ slug: 'rollback' })).toBe(0);
      expect(await UserModel.countDocuments({ email: 'rollback@example.test' })).toBe(0);
    } finally {
      queue.mockRestore();
    }
  });
  it('provisions a trial and initial queue with configurable defaults', async () => {
    await asOwner(() =>
      updateProvisioningDefaults({ trialDays: 45, storageLimitBytes: 5_000_000_000 }),
    );
    await asOwner(() =>
      createTenant({
        name: 'New company',
        slug: 'new-company',
        adminName: 'Admin',
        adminEmail: 'new@example.test',
      }),
    );
    const created = await TenantModel.findOne({ slug: 'new-company' });
    expect(created?.storageLimitBytes).toBe(5_000_000_000);
    expect(created?.commercial?.status).toBe('trialing');
    expect(
      created!.commercial!.trialEndsAt!.getTime() - created!.commercial!.startedAt!.getTime(),
    ).toBe(45 * DAY_MS);
    expect(await UserModel.countDocuments({ tenantId: created!._id, role: 'tenant_admin' })).toBe(
      1,
    );
    expect(await QueueModel.countDocuments({ tenantId: created!._id, isDefault: true })).toBe(1);
    expect(
      await AuditLogModel.countDocuments({ entityId: created!._id, action: 'tenant.created' }),
    ).toBe(2);
  });
  it('blocks tenant administrators from commercial controls or promoting themselves', async () => {
    await UserModel.updateOne({ _id: actorId }, { $set: { role: 'tenant_admin' } });
    const tenantContext = { ...context, isPlatformAdmin: false };
    const forbidden: (() => Promise<unknown>)[] = [
      () => listTenants(),
      () => setTenantStorageLimit(String(tenantId), 20, 'Unauthorised'),
      () => updateProvisioningDefaults({ trialDays: 90, storageLimitBytes: 20 }),
      () =>
        createUser({
          name: 'Injected owner',
          email: 'injected@example.test',
          role: 'platform_admin',
        }),
      () => updateUserRole(String(actorId), 'platform_admin'),
    ];
    for (const work of forbidden)
      await expect(runWithContext(tenantContext, work)).rejects.toThrow(/platform owner/);
    // A forged context flag is insufficient: the service also checks the stored actor role.
    await expect(asOwner(() => listTenants())).rejects.toThrow(/platform owner/);
  });
  it('expires a trial on an existing session, preserves data, and restores it through an audited extension', async () => {
    const session = await createSession({ tenantId, userId: actorId });
    await TenantModel.updateOne(
      { _id: tenantId },
      {
        $set: {
          'commercial.status': 'trialing',
          'commercial.trialEndsAt': new Date(Date.now() - DAY_MS),
        },
      },
    );
    expect((await resolveAuthenticatedUser(session.token))?.workspaceAccess).toBe('trial_expired');
    await expect(assertWorkspaceAccess(String(tenantId))).rejects.toThrow(/unavailable/);
    await expect(put(1)).rejects.toThrow(/unavailable/);
    await asOwner(() => extendTenantTrial(String(tenantId), 30, 'Evaluation extension'));
    expect((await resolveAuthenticatedUser(session.token))?.workspaceAccess).toBe('allowed');
    expect(
      await AuditLogModel.countDocuments({ action: 'tenant.trial_extended', entityId: tenantId }),
    ).toBe(1);
    expect(await UserModel.countDocuments({ tenantId })).toBe(1);
  });
  it('rejects a cross-tenant session and non-platform impersonation', async () => {
    await UserModel.updateOne({ _id: actorId }, { $set: { role: 'tenant_admin' } });
    const session = await createSession({ tenantId, userId: actorId });
    await SessionModel.updateOne(
      { userId: actorId },
      { $set: { impersonatedTenantId: new Types.ObjectId() } },
    );
    expect(await resolveAuthenticatedUser(session.token)).toBeNull();
    await SessionModel.updateOne(
      { userId: actorId },
      { $set: { impersonatedTenantId: null, tenantId: new Types.ObjectId() } },
    );
    expect(await resolveAuthenticatedUser(session.token)).toBeNull();
  });
});
