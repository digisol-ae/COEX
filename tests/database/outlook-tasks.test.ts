import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { connectForTests, clearDatabase, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { UserModel } from '@coex/shared/core/models/user.model';
import { SpaceModel } from '@coex/shared/tasks/models/space.model';
import { TaskModel } from '@coex/shared/tasks/models/task.model';
import { TimeEntryModel } from '@coex/shared/time/models/time-entry.model';
import { createOutlookTask, outlookChoices } from '@/modules/integrations/outlook/outlook.service';
import { taskUpdateImage, listTaskComments } from '@/modules/tasks/services/task.service';
import { latestTeamWork } from '@/modules/time/services/activity.service';
const context = {
  tenantId: new Types.ObjectId(),
  userId: new Types.ObjectId(),
  isPlatformAdmin: false,
};
const inContext = <T>(work: () => Promise<T>) => runWithContext(context, work);
let spaceId: string;
beforeAll(() => connectForTests('outlook_feedback'));
afterAll(disconnectFromTests);
beforeEach(async () => {
  await clearDatabase();
  await UserModel.create({
    _id: context.userId,
    tenantId: context.tenantId,
    name: 'QA Agent',
    email: 'qa@example.test',
    role: 'tenant_admin',
    status: 'active',
  });
  const space = await SpaceModel.create({
    tenantId: context.tenantId,
    name: 'QA Space',
    statuses: [{ name: 'To do', isClosed: false, sortOrder: 0 }],
  });
  spaceId = String(space._id);
});
const email = () => ({
  messageId: '<qa-email@example.test>',
  mailbox: 'qa@example.test',
  title: 'QA Email task',
  body: 'Please follow up',
  sender: 'Customer <person@example.test>',
  sentAt: '2026-10-27',
  spaceId,
  assigneeIds: [String(context.userId)],
  attachments: [
    {
      fileName: 'qa.txt',
      contentType: 'text/plain',
      base64: Buffer.from('Synthetic attachment').toString('base64'),
    },
  ],
});
it('creates one task per email, preserves source and attachments and prevents concurrent duplicates', async () => {
  await inContext(async () => {
    const results = await Promise.allSettled([
      createOutlookTask(email(), true),
      createOutlookTask(email(), true),
    ]);
    const success = results.find((r) => r.status === 'fulfilled');
    expect(success?.status).toBe('fulfilled');
    expect(await TaskModel.countDocuments({ tenantId: context.tenantId })).toBe(1);
    const repeated = await createOutlookTask(email(), true);
    expect(repeated.duplicate).toBe(true);
    expect(repeated.attachmentWarning).toBe(false);
    const task = await TaskModel.findById(repeated.taskId);
    expect(task?.description).toContain('person@example.test');
    expect(task?.description).toContain('<qa-email@example.test>');
    const comments = await listTaskComments(repeated.taskId);
    const file = comments[0].attachments[0];
    expect((await taskUpdateImage(repeated.taskId, file.id))?.body.toString()).toBe(
      'Synthetic attachment',
    );
  });
});
it('rejects foreign spaces, mismatched folders, foreign staff and oversized files', async () => {
  await inContext(async () => {
    await expect(
      createOutlookTask({ ...email(), spaceId: String(new Types.ObjectId()) }, true),
    ).rejects.toThrow('space');
    await expect(
      createOutlookTask({ ...email(), folderId: String(new Types.ObjectId()) }, true),
    ).rejects.toThrow('folder');
    await expect(
      createOutlookTask({ ...email(), assigneeIds: [String(new Types.ObjectId())] }, true),
    ).rejects.toThrow('staff');
    await expect(
      createOutlookTask(
        {
          ...email(),
          attachments: [
            {
              fileName: 'big.txt',
              contentType: 'text/plain',
              base64: Buffer.alloc(3 * 1024 * 1024 + 1).toString('base64'),
            },
          ],
        },
        true,
      ),
    ).rejects.toThrow();
    expect(await TaskModel.countDocuments()).toBe(0);
  });
});
it('keeps customer choices hidden without customer permission and private spaces hidden', async () => {
  await SpaceModel.create({
    tenantId: context.tenantId,
    name: 'Other private space',
    memberIds: [new Types.ObjectId()],
    isPersonal: true,
    ownerId: new Types.ObjectId(),
  });
  await inContext(async () => {
    const choices = await outlookChoices(false);
    expect(choices.customers).toEqual([]);
    expect(choices.spaces.map((s) => s.name)).not.toContain('Other private space');
  });
});
it('finds latest recorded work across dates, ignores deleted and foreign tenant entries', async () => {
  const at = new Date('2025-12-31T10:00:00Z');
  await TimeEntryModel.create({
    tenantId: context.tenantId,
    userId: context.userId,
    taskId: new Types.ObjectId(),
    workDate: at,
    endedAt: at,
    minutes: 30,
  });
  await TimeEntryModel.create({
    tenantId: new Types.ObjectId(),
    userId: context.userId,
    taskId: new Types.ObjectId(),
    workDate: new Date(),
    running: true,
  });
  await TimeEntryModel.create({
    tenantId: context.tenantId,
    userId: context.userId,
    taskId: new Types.ObjectId(),
    workDate: new Date(),
    running: true,
    deletedAt: new Date(),
  });
  const result = await inContext(latestTeamWork);
  expect(result.get(String(context.userId))).toEqual({ at, running: false });
});
