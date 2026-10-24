import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { UserModel } from '@coex/shared/core/models/user.model';
import { TaskModel } from '@coex/shared/tasks/models/task.model';
import { runWithContext } from '../apps/web/src/lib/tenant-context';
import { saveGanttSchedule } from '../apps/web/src/modules/tasks/services/gantt.service';
import { createTask } from '../apps/web/src/modules/tasks/services/task.service';
async function main() {
  const uri = new URL(process.env.MONGODB_URI ?? '');
  if (
    !existsSync('/.dockerenv') ||
    uri.hostname !== 'mongo' ||
    uri.pathname !== '/coex_docker_local'
  )
    throw Error('Docker local database only.');
  await mongoose.connect(uri.toString());
  const actor = await UserModel.findOne({ email: 'docker-admin@example.test', deletedAt: null });
  assert(actor);
  await runWithContext(
    { tenantId: actor.tenantId, userId: actor._id, isPlatformAdmin: true },
    async () => {
      const task = await TaskModel.findOne({
        tenantId: actor.tenantId,
        title: 'Docker QA Gantt 01 Overdue morning',
        deletedAt: null,
      });
      assert(task?.startAt && task.endAt, 'Create isolated Gantt QA fixtures first.');
      const original = { startAt: task.startAt.toISOString(), endAt: task.endAt.toISOString() };
      const next = {
        startAt: new Date(task.startAt.getTime() + 86400000).toISOString(),
        endAt: new Date(task.endAt.getTime() + 86400000).toISOString(),
      };
      const input = {
        id: String(task._id),
        spaceId: String(task.spaceId),
        ...next,
        expectedStartAt: original.startAt,
        expectedEndAt: original.endAt,
      };
      const saved = await saveGanttSchedule(input);
      assert.deepEqual(saved, next);
      const stored = await TaskModel.findById(task._id);
      assert.equal(stored?.startAt?.toISOString(), next.startAt);
      await assert.rejects(() => saveGanttSchedule(input), /changed since/);
      await saveGanttSchedule({
        ...input,
        ...original,
        expectedStartAt: next.startAt,
        expectedEndAt: next.endAt,
      });
      assert.equal((await TaskModel.findById(task._id))?.startAt?.toISOString(), original.startAt);
      console.log(
        'PASS persisted move, stale-save rejection, persisted Undo and original-date restoration',
      );
      await assert.rejects(
        () => saveGanttSchedule({ ...input, startAt: original.endAt, endAt: original.startAt }),
        /valid start/,
      );
      const readonly = await UserModel.create({
        tenantId: actor.tenantId,
        name: 'Docker QA Gantt Read Only',
        email: `docker-gantt-readonly-${Date.now()}@example.test`,
        role: 'agent',
        permissionDenials: ['task.manage'],
        status: 'active',
      });
      try {
        await runWithContext(
          { tenantId: actor.tenantId, userId: readonly._id, isPlatformAdmin: false },
          async () => {
            await assert.rejects(() => saveGanttSchedule(input), /may not/);
          },
        );
      } finally {
        await UserModel.updateOne(
          { _id: readonly._id, tenantId: actor.tenantId },
          { $set: { status: 'inactive' } },
        );
      }
      await runWithContext(
        { tenantId: new mongoose.Types.ObjectId(), userId: actor._id, isPlatformAdmin: true },
        async () => {
          await assert.rejects(() => saveGanttSchedule(input), /not found/);
        },
      );
      const privateTask = await TaskModel.findOne({
        tenantId: actor.tenantId,
        title: /^Docker QA Hidden/,
        deletedAt: null,
      });
      if (privateTask)
        await assert.rejects(
          () =>
            saveGanttSchedule({
              ...input,
              id: String(privateTask._id),
              spaceId: String(privateTask.spaceId),
            }),
          /not found/,
        );
      let closed = await TaskModel.findOne({
        tenantId: actor.tenantId,
        spaceId: task.spaceId,
        title: 'Docker QA Gantt Closed task',
        deletedAt: null,
      });
      if (!closed) {
        const id = await createTask({
          spaceId: String(task.spaceId),
          title: 'Docker QA Gantt Closed task',
          status: 'Done',
          startAt: '2026-10-20T09:00',
          endAt: '2026-10-20T17:00',
        });
        closed = await TaskModel.findById(id);
      }
      assert(closed?.isClosed);
      await assert.rejects(() => saveGanttSchedule({ ...input, id: String(closed._id) }), /Reopen/);
      console.log(
        'PASS invalid dates, actual denied account, cross-tenant, personal-task privacy and closed-task protection',
      );
    },
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
