/**
 * Finds tasks whose space is missing, and optionally fixes one.
 *
 * A task's space is required by its own schema, so this should be impossible for a task created
 * normally; a task like this got into the database some other way. Connects straight to Mongo the
 * same way scripts/seed.ts does.
 *
 * Report only:
 *   npm run check:tasks
 *
 * Fix one task by giving it a space, either by name or by id (from the Spaces page URL):
 *   FIX_TASK_NUMBER=<task number, e.g. DGS-T-1> FIX_SPACE_NAME=<space name> npm run check:tasks
 *   FIX_TASK_NUMBER=<task number, e.g. DGS-T-1> FIX_SPACE_ID=<space id> npm run check:tasks
 *
 * Delete a task instead, along with any timer entries logged against it:
 *   DELETE_TASK_NUMBER=<task number, e.g. DGS-T-1> npm run check:tasks
 */

import mongoose from 'mongoose';
import { TaskModel } from '../src/modules/tasks/models/task.model';
import { SpaceModel } from '../src/modules/tasks/models/space.model';
import { TimeEntryModel } from '../src/modules/time/models/time-entry.model';

async function main() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not set. Run this with npm run check:tasks so .env.local is loaded.');
  }

  await mongoose.connect(uri);
  console.log('Connected to', mongoose.connection.name);

  const deleteNumber = process.env.DELETE_TASK_NUMBER;

  if (deleteNumber) {
    const task = await TaskModel.findOne({ number: deleteNumber });
    if (!task) throw new Error(`No task numbered ${deleteNumber}.`);

    const entries = await TimeEntryModel.deleteMany({ taskId: task._id });
    await TaskModel.deleteOne({ _id: task._id });

    console.log('');
    console.log(`Deleted: ${task.number} "${task.title}"`);
    console.log(`  along with ${entries.deletedCount} timer ${entries.deletedCount === 1 ? 'entry' : 'entries'} logged against it.`);
    await mongoose.disconnect();
    return;
  }

  const fixNumber = process.env.FIX_TASK_NUMBER;
  const fixSpaceId = process.env.FIX_SPACE_ID;
  const fixSpaceName = process.env.FIX_SPACE_NAME;

  if (fixNumber) {
    if (!fixSpaceId && !fixSpaceName) {
      throw new Error('FIX_TASK_NUMBER was set without FIX_SPACE_ID or FIX_SPACE_NAME.');
    }

    const task = await TaskModel.findOne({ number: fixNumber });
    if (!task) throw new Error(`No task numbered ${fixNumber}.`);

    const space = fixSpaceId
      ? await SpaceModel.findOne({ _id: fixSpaceId, tenantId: task.tenantId })
      : await SpaceModel.findOne({
          tenantId: task.tenantId,
          name: new RegExp(`^${fixSpaceName}$`, 'i'),
        });

    if (!space) {
      if (fixSpaceId) {
        throw new Error(`No space ${fixSpaceId} in this task's tenant.`);
      }

      const all = await SpaceModel.find({ tenantId: task.tenantId }).select('name');
      const list = all.map((s) => `  - ${s.name}`).join('\n');

      throw new Error(
        `No space named "${fixSpaceName}" in this task's tenant. Spaces that do exist:\n${list}`,
      );
    }

    await TaskModel.updateOne({ _id: task._id }, { $set: { spaceId: space._id } });

    console.log('');
    console.log(`Fixed: ${task.number} "${task.title}" now belongs to space "${space.name}".`);
    await mongoose.disconnect();
    return;
  }

  const broken = await TaskModel.find({
    $or: [{ spaceId: null }, { spaceId: { $exists: false } }],
  }).select('number title tenantId createdAt deletedAt');

  console.log('');

  if (broken.length === 0) {
    console.log('No tasks are missing a space.');
  } else {
    console.log(`${broken.length} task${broken.length === 1 ? '' : 's'} missing a space:`);
    console.log('');

    for (const task of broken) {
      console.log(`  ${task.number}  "${task.title}"`);
      console.log(
        `    tenant ${task.tenantId}, created ${task.createdAt?.toISOString() ?? 'unknown'}${task.deletedAt ? ', already archived' : ''}`,
      );
    }

    console.log('');
    console.log('To give one a space:');
    console.log('  FIX_TASK_NUMBER=<number> FIX_SPACE_NAME=<space name> npm run check:tasks');
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
