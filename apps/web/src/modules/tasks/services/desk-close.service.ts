import type { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { runWithContext } from '@/lib/tenant-context';
import { DeskEntryModel } from '@coex/shared/tasks/models/desk-entry.model';
import { finishMyDesk } from './desk.service';

/**
 * The automatic office-day close. It runs finishMyDesk for every user who still has an active desk,
 * so each day's snapshot is written even when someone forgets to choose "I am done". Safe to run
 * repeatedly: finishMyDesk upserts today's snapshot and only removes tasks that are complete.
 */
export async function closeOfficeDay(at = new Date()): Promise<{
  users: number;
  failures: { userId: string; message: string }[];
}> {
  await connectToDatabase();
  const owners = await DeskEntryModel.aggregate<{
    _id: { tenantId: Types.ObjectId; userId: Types.ObjectId };
  }>([{ $group: { _id: { tenantId: '$tenantId', userId: '$userId' } } }]);
  let users = 0;
  const failures: { userId: string; message: string }[] = [];
  for (const owner of owners) {
    try {
      await runWithContext(
        { tenantId: owner._id.tenantId, userId: owner._id.userId, isPlatformAdmin: false },
        () => finishMyDesk(at),
      );
      users += 1;
    } catch (error) {
      failures.push({
        userId: String(owner._id.userId),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { users, failures };
}
