import { Types } from 'mongoose';
import { TaskModel } from '@coex/shared/tasks/models/task.model';
import { validSchedule } from '@coex/shared/tasks/gantt';
import { repository } from '@/lib/repository';
import { actorCan } from '@/modules/crm/services/access.service';
import { recordAudit } from '@/modules/core/services/audit.service';
import { getTask } from './task.service';
export interface GanttScheduleInput {
  id: string;
  spaceId: string;
  startAt: string;
  endAt: string;
  expectedStartAt: string;
  expectedEndAt: string;
}
/** Visible-task authorization and an atomic date comparison protect drag edits and Undo. */
export async function saveGanttSchedule(input: GanttScheduleInput) {
  if (!(await actorCan('task.manage'))) throw new Error('You may not change task dates.');
  if (!Types.ObjectId.isValid(input.id) || !Types.ObjectId.isValid(input.spaceId))
    throw new Error('Task not found.');
  const instant = (value: unknown) => {
    if (
      typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,9})?)?(Z|[+-](0\d|1[0-4]):[0-5]\d)$/.test(
        value,
      )
    )
      return false;
    const day = new Date(value.slice(0, 10) + 'T00:00:00Z');
    return (
      Number.isFinite(day.getTime()) &&
      day.toISOString().slice(0, 10) === value.slice(0, 10) &&
      Number.isFinite(Date.parse(value))
    );
  };
  if (
    ![input.startAt, input.endAt, input.expectedStartAt, input.expectedEndAt].every(instant) ||
    !validSchedule(input.startAt, input.endAt)
  )
    throw new Error('Enter a valid start and an end after it.');
  const before = await getTask(input.id);
  if (!before || String(before.spaceId) !== input.spaceId) throw new Error('Task not found.');
  if (before.isClosed) throw new Error('Reopen this task before changing its schedule.');
  const startAt = new Date(input.startAt),
    endAt = new Date(input.endAt);
  const after = await repository(TaskModel).updateOne(
    {
      _id: before._id,
      spaceId: before.spaceId,
      isClosed: false,
      startAt: new Date(input.expectedStartAt),
      endAt: new Date(input.expectedEndAt),
    },
    { $set: { startAt, endAt, lastActivityAt: new Date() } },
  );
  if (!after)
    throw new Error(
      'Task dates changed since you started. Discard this preview and reload before editing again.',
    );
  await recordAudit({
    action: 'task.updated',
    entityType: 'Task',
    entityId: before._id,
    before: { startAt: before.startAt, endAt: before.endAt },
    after: { startAt, endAt, source: 'gantt' },
  });
  return { startAt: startAt.toISOString(), endAt: endAt.toISOString() };
}
