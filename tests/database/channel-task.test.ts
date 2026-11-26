import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { connectForTests, clearDatabase, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { AuditLogModel } from '@coex/shared/core/models/audit-log.model';
import { SpaceModel } from '@coex/shared/tasks/models/space.model';
import { TaskModel } from '@coex/shared/tasks/models/task.model';
import { ChannelMessageModel } from '@coex/shared/channels/models/channel-message.model';
import { createTaskFromChannelMessage } from '@/modules/channels/services/channel-task.service';

const tenantId = new Types.ObjectId(),
  userId = new Types.ObjectId(),
  spaceId = new Types.ObjectId();
const context = { tenantId, userId, isPlatformAdmin: false };
let messageId = '';
beforeAll(() => connectForTests('channel_task'));
afterAll(disconnectFromTests);
beforeEach(async () => {
  await clearDatabase();
  await TenantModel.create({ _id: tenantId, name: 'Channel QA', slug: 'channel-qa' });
  await UserModel.create({
    _id: userId,
    tenantId,
    name: 'Admin',
    email: 'admin@example.test',
    role: 'tenant_admin',
    status: 'active',
  });
  await SpaceModel.create({ _id: spaceId, tenantId, name: 'Follow-up' });
  const message = await ChannelMessageModel.create({
    tenantId,
    direction: 'in',
    account: 'support',
    provider: 'mock',
    type: 'text',
    status: 'received',
    from: '+971500000001',
    to: '+971500000002',
    text: 'Please arrange a review.',
  });
  messageId = String(message._id);
});
const create = () =>
  runWithContext(context, () =>
    createTaskFromChannelMessage({ messageId, spaceId: String(spaceId), title: 'Arrange review' }),
  );

it('creates one audited task for repeated and concurrent clicks without replying to the customer', async () => {
  const ids = await Promise.all([create(), create()]);
  expect(ids[0]).toBe(ids[1]);
  expect(await create()).toBe(ids[0]);
  expect(await TaskModel.countDocuments({ tenantId })).toBe(1);
  expect((await TaskModel.findById(ids[0]))!.description).toContain('Please arrange a review.');
  expect(await AuditLogModel.countDocuments({ action: 'channel.task_created' })).toBe(1);
  expect(await ChannelMessageModel.countDocuments({ direction: 'out' })).toBe(0);
});
it('rolls back the task and source link if the audit cannot be saved', async () => {
  const audit = vi.spyOn(AuditLogModel, 'create').mockRejectedValueOnce(Error('audit failed'));
  try {
    await expect(create()).rejects.toThrow('audit failed');
  } finally {
    audit.mockRestore();
  }
  expect(await TaskModel.countDocuments({ tenantId })).toBe(0);
  expect((await ChannelMessageModel.findById(messageId))!.taskId).toBeNull();
  await expect(create()).resolves.toBeDefined();
});
it('refuses another tenant’s message and destination even for a tenant administrator', async () => {
  const foreign = new Types.ObjectId();
  await ChannelMessageModel.updateOne({ _id: messageId }, { $set: { tenantId: foreign } });
  await expect(create()).rejects.toThrow('Message unavailable');
  await ChannelMessageModel.updateOne({ _id: messageId }, { $set: { tenantId } });
  await SpaceModel.updateOne({ _id: spaceId }, { $set: { tenantId: foreign } });
  await expect(create()).rejects.toThrow('Space unavailable');
});
it('refuses portal users and ordinary agents, and disabled task modules', async () => {
  for (const role of ['client_contact', 'agent']) {
    await UserModel.updateOne({ _id: userId }, { $set: { role } });
    await expect(create()).rejects.toThrow('not allowed');
  }
  await UserModel.updateOne({ _id: userId }, { $set: { role: 'tenant_admin' } });
  await TenantModel.updateOne({ _id: tenantId }, { $set: { 'modules.tasks': false } });
  await expect(create()).rejects.toThrow('module');
});
it('does not let an administrator write into another person’s Personal space', async () => {
  await SpaceModel.updateOne(
    { _id: spaceId },
    { $set: { isPersonal: true, ownerId: new Types.ObjectId() } },
  );
  await expect(create()).rejects.toThrow('Space unavailable');
});
