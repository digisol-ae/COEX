import mongoose from 'mongoose';
import { writeFileSync, mkdirSync } from 'node:fs';
import { UserModel } from '@coex/shared/core/models/user.model';
import { SpaceModel } from '@coex/shared/tasks/models/space.model';
import { TaskModel } from '@coex/shared/tasks/models/task.model';
import { runWithContext } from '../apps/web/src/lib/tenant-context';
import { createTask } from '../apps/web/src/modules/tasks/services/task.service';
import { createSpace } from '../apps/web/src/modules/tasks/services/space.service';
import { buildGanttPDF } from '../apps/web/src/modules/tasks/gantt-report';
import { listTasks } from '../apps/web/src/modules/tasks/services/task.service';
async function main() {
  const uri = process.env.MONGODB_URI;
  if (uri !== 'mongodb://127.0.0.1:27020/worktello_feedback_local')
    throw new Error('Dedicated local feedback database only.');
  await mongoose.connect(uri);
  const actor = await UserModel.findOne({ email: 'feedback-admin@example.test', deletedAt: null });
  if (!actor) throw new Error('Run seed-feedback-local first.');
  await runWithContext(
    { tenantId: actor.tenantId, userId: actor._id, isPlatformAdmin: false },
    async () => {
      const name = 'QA Gantt - Tasks and Subtasks';
      const space = await SpaceModel.findOne({ tenantId: actor.tenantId, name, deletedAt: null });
      const spaceId = space
        ? String(space._id)
        : await createSpace({
            name,
            description:
              'Synthetic Gantt QA data: 12 tasks with 3 subtasks each. Local testing only.',
          });
      const instant = (day: number, hour = 9) =>
        `2026-10-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00`;
      for (let index = 0; index < 12; index++) {
        const title = `[Gantt QA ${String(index + 1).padStart(2, '0')}] ${['Plan requirements', 'Design interface', 'Build task service', 'Prepare customer review', 'Test access rules', 'Review translations', 'Check attachments', 'Run release checks', 'Write handover', 'Confirm schedule', 'Independent subtask dates', 'Unscheduled backlog'][index]}`;
        if (await TaskModel.exists({ tenantId: actor.tenantId, spaceId, title, deletedAt: null }))
          continue;
        const start = 16 + index,
          end = Math.min(31, start + 2);
        const taskId = await createTask({
          spaceId,
          title,
          assigneeIds: [String(actor._id)],
          startAt: index >= 10 ? null : instant(start),
          endAt: index >= 10 ? null : instant(end, 17),
          estimateMinutes: 120,
        });
        await TaskModel.updateOne(
          { _id: taskId, tenantId: actor.tenantId },
          {
            $set: {
              subtasks: [
                {
                  title: `${index + 1}.1 Review scope`,
                  done: index % 3 === 0,
                  assigneeId: actor._id,
                  startAt: index === 10 ? new Date('2026-11-02T05:00:00Z') : null,
                  endAt: index === 10 ? new Date('2026-11-03T13:00:00Z') : null,
                },
                {
                  title: `${index + 1}.2 Implement and verify`,
                  done: false,
                  assigneeId: actor._id,
                  startAt:
                    index < 10
                      ? new Date(`2026-10-${String(start + 1).padStart(2, '0')}T05:00:00Z`)
                      : null,
                  endAt:
                    index < 10
                      ? new Date(`2026-10-${String(end).padStart(2, '0')}T13:00:00Z`)
                      : null,
                },
                { title: `${index + 1}.3 Prepare acceptance notes`, done: false, assigneeId: null },
              ],
              ...(index === 1 ? { isClosed: true, status: 'Done' } : {}),
            },
          },
        );
      }
      const tasks = await listTasks({ spaceId, includeClosed: true });
      const pdf = await buildGanttPDF({ title: name, tasks, now: new Date().toISOString() });
      mkdirSync('output/pdf', { recursive: true });
      writeFileSync('output/pdf/worktello-gantt-qa.pdf', pdf);
      mkdirSync('outputs/qa/gantt-20261028', { recursive: true });
      writeFileSync(
        'outputs/qa/gantt-20261028/inventory.json',
        JSON.stringify(
          {
            spaceId,
            tasks: tasks.length,
            subtasks: tasks.reduce((sum, t) => sum + t.subtaskCount, 0),
            url: `http://localhost:3111/spaces/${spaceId}?view=gantt`,
          },
          null,
          2,
        ),
      );
      console.log(
        JSON.stringify({
          spaceId,
          tasks: tasks.length,
          subtasks: tasks.reduce((sum, t) => sum + t.subtaskCount, 0),
          url: `http://localhost:3111/spaces/${spaceId}?view=gantt`,
        }),
      );
    },
  );
  await mongoose.disconnect();
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
