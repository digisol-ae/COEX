import { beforeAll, beforeEach, afterAll, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { connectForTests, clearDatabase, disconnectFromTests } from '../setup';
import { UserModel } from '@coex/shared/core/models/user.model';
import { SpaceModel } from '@coex/shared/tasks/models/space.model';
import { TaskModel } from '@coex/shared/tasks/models/task.model';
import { runWithContext } from '@/lib/tenant-context';
import { saveGanttSchedule } from '@/modules/tasks/services/gantt.service';
const context = {
  tenantId: new Types.ObjectId(),
  userId: new Types.ObjectId(),
  isPlatformAdmin: false,
};
const other = {
  tenantId: new Types.ObjectId(),
  userId: new Types.ObjectId(),
  isPlatformAdmin: false,
};
let spaceId: string, taskId: string, subtaskId: string;
const parentStart = '2026-10-28T05:00:00.000Z',
  parentEnd = '2026-10-30T13:00:00.000Z';
const input = () => ({
  id: taskId,
  spaceId,
  subtaskId,
  startAt: '2026-10-29T05:00:00.000Z',
  endAt: '2026-10-30T12:00:00.000Z',
  expectedStartAt: null,
  expectedEndAt: null,
});
beforeAll(() => connectForTests('gantt_subtasks'));
afterAll(disconnectFromTests);
beforeEach(async () => {
  await clearDatabase();
  for (const c of [context, other])
    await UserModel.create({
      _id: c.userId,
      tenantId: c.tenantId,
      email: `${c.userId}@example.test`,
      name: 'QA Admin',
      role: 'tenant_admin',
      status: 'active',
    });
  const space = await SpaceModel.create({
    tenantId: context.tenantId,
    name: 'Gantt QA',
    statuses: [{ name: 'To do', isClosed: false, sortOrder: 0 }],
  });
  spaceId = String(space._id);
  const task = await TaskModel.create({
    tenantId: context.tenantId,
    spaceId,
    number: 'QA-1',
    title: 'QA parent',
    status: 'To do',
    startAt: parentStart,
    endAt: parentEnd,
    subtasks: [{ title: 'Child', done: false }],
  });
  taskId = String(task._id);
  subtaskId = String(task.subtasks[0]._id);
});
it('saves child dates atomically, keeps parent dates and permits undo back to inheritance', async () => {
  await runWithContext(context, () => saveGanttSchedule(input()));
  const saved = await TaskModel.findById(taskId);
  expect(saved?.startAt?.toISOString()).toBe(parentStart);
  expect(saved?.subtasks[0].startAt?.toISOString()).toBe(input().startAt);
  await expect(runWithContext(context, () => saveGanttSchedule(input()))).rejects.toThrow(
    'changed since',
  );
  await runWithContext(context, () =>
    saveGanttSchedule({
      ...input(),
      startAt: null,
      endAt: null,
      expectedStartAt: input().startAt,
      expectedEndAt: input().endAt,
    }),
  );
  expect((await TaskModel.findById(taskId))?.subtasks[0].startAt).toBeNull();
});
it('denies foreign tenants, private spaces, nonexistent or completed subtasks', async () => {
  await expect(runWithContext(other, () => saveGanttSchedule(input()))).rejects.toThrow(
    'not found',
  );
  await expect(
    runWithContext(context, () =>
      saveGanttSchedule({ ...input(), subtaskId: String(new Types.ObjectId()) }),
    ),
  ).rejects.toThrow('not found');
  await SpaceModel.updateOne(
    { _id: spaceId },
    { $set: { isPersonal: true, ownerId: other.userId } },
  );
  await expect(runWithContext(context, () => saveGanttSchedule(input()))).rejects.toThrow(
    'not found',
  );
  await SpaceModel.updateOne({ _id: spaceId }, { $set: { isPersonal: false, ownerId: null } });
  await TaskModel.updateOne({ _id: taskId }, { $set: { 'subtasks.0.done': true } });
  await expect(runWithContext(context, () => saveGanttSchedule(input()))).rejects.toThrow('Reopen');
});
it('supports scheduling a parent with only a due date', async () => {
  await TaskModel.updateOne({ _id: taskId }, { $set: { startAt: null } });
  await runWithContext(context, () =>
    saveGanttSchedule({
      ...input(),
      subtaskId: undefined,
      expectedStartAt: null,
      expectedEndAt: parentEnd,
    }),
  );
  expect((await TaskModel.findById(taskId))?.startAt?.toISOString()).toBe(input().startAt);
  await runWithContext(context, () =>
    saveGanttSchedule({
      ...input(),
      subtaskId: undefined,
      startAt: null,
      endAt: parentEnd,
      expectedStartAt: input().startAt,
      expectedEndAt: input().endAt,
    }),
  );
  const restored = await TaskModel.findById(taskId);
  expect(restored?.startAt).toBeNull();
  expect(restored?.endAt?.toISOString()).toBe(parentEnd);
});
