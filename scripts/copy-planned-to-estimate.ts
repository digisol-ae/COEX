/**
 * One time: where a task has planned hours but no estimate, the planned hours become the estimate
 * (John, 15 Oct 2026: Estimated time is now the one field and Planned hours are gone from the screens).
 * Safe to run twice: it only fills estimates that are empty, and it reports how many it changed.
 *
 *   npx tsx --env-file=.env scripts/copy-planned-to-estimate.ts            (shows what it would do)
 *   APPLY=1 npx tsx --env-file=.env scripts/copy-planned-to-estimate.ts    (does it)
 */

import mongoose from 'mongoose';
import { TaskModel } from '@coex/shared/tasks/models/task.model';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set. Run with --env-file=.env (or .env.local).');

  await mongoose.connect(uri);
  console.log('Connected to', mongoose.connection.name);

  const filter = {
    plannedMinutes: { $gt: 0 },
    $or: [
      { estimateMinutes: null },
      { estimateMinutes: 0 },
      { estimateMinutes: { $exists: false } },
    ],
  };
  const count = await TaskModel.countDocuments(filter);
  console.log(`${count} task(s) have planned hours and no estimate.`);

  if (process.env.APPLY === '1' && count > 0) {
    const result = await TaskModel.updateMany(filter, [
      { $set: { estimateMinutes: '$plannedMinutes' } },
    ]);
    console.log(`Copied planned hours into the estimate on ${result.modifiedCount} task(s).`);
  } else if (count > 0) {
    console.log('Nothing changed. Run again with APPLY=1 to copy them.');
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
