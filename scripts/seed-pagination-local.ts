import mongoose from 'mongoose';
import { UserModel } from '@coex/shared/core/models/user.model';
import { SpaceModel } from '@coex/shared/tasks/models/space.model';
import { TaskModel } from '@coex/shared/tasks/models/task.model';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { runWithContext } from '../apps/web/src/lib/tenant-context';
import { createTask } from '../apps/web/src/modules/tasks/services/task.service';
import { createSpace } from '../apps/web/src/modules/tasks/services/space.service';
async function main() {
  const uri = process.env.MONGODB_URI;
  if (uri !== 'mongodb://127.0.0.1:27020/worktello_feedback_local')
    throw new Error('Isolated feedback database only');
  await mongoose.connect(uri);
  const actor = await UserModel.findOne({ email: 'feedback-admin@example.test', deletedAt: null });
  if (!actor) throw new Error('Seed the feedback QA user first');
  await runWithContext(
    { tenantId: actor.tenantId, userId: actor._id, isPlatformAdmin: false },
    async () => {
      const name = 'QA Pagination - 55 records';
      const existing = await SpaceModel.findOne({
        tenantId: actor.tenantId,
        name,
        deletedAt: null,
      });
      const spaceId = existing
        ? String(existing._id)
        : await createSpace({ name, description: 'Synthetic pagination QA only' });
      for (let index = 1; index <= 55; index++) {
        const title = `[Paging QA ${String(index).padStart(2, '0')}] Test record`;
        if (
          !(await TaskModel.exists({ tenantId: actor.tenantId, spaceId, title, deletedAt: null }))
        )
          await createTask({
            spaceId,
            title,
            assigneeIds: [String(actor._id)],
            endAt: index % 2 ? '2026-10-01T09:00' : undefined,
          });
        const customerName = `[Paging QA ${String(index).padStart(2, '0')}] Customer`;
        await OrganisationModel.updateOne(
          { tenantId: actor.tenantId, name: customerName },
          { $setOnInsert: { kind: 'client', status: 'active' } },
          { upsert: true },
        );
      }
      console.log(
        JSON.stringify({ spaceId, tasks: 55, customers: 55, database: mongoose.connection.name }),
      );
    },
  );
  await mongoose.disconnect();
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
