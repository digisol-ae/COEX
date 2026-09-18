import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { repository } from '@/lib/repository';
import { toObjectId } from '@/lib/ids';
import { recordAudit, changedFields } from '@/modules/core/services/audit.service';
import { TaskModel } from '@/modules/tasks/models/task.model';
import { TimeEntryModel } from '../models/time-entry.model';
import { WeekLockModel } from '../models/week-lock.model';
import { startOfDay, startOfWeek } from '../week';

/**
 * Time tracking.
 *
 * Two rules shape everything here. A person may have only one timer running, enforced by a partial
 * unique index rather than by a check that two browser tabs could both pass. And a locked week is
 * immutable: entries inside it cannot be created, edited or removed, because time is the basis of
 * billing and of any claim about where effort went.
 */

const entries = () => repository(TimeEntryModel);

export interface RunningTimer {
  entryId: string;
  taskId: string;
  taskNumber: string;
  taskTitle: string;
  startedAt: Date;
  elapsedMinutes: number;
}

export async function getRunningTimer(userId?: string): Promise<RunningTimer | null> {
  await connectToDatabase();

  const context = getContext();
  const owner = userId ? toObjectId(userId) : context.userId;

  const running = await entries().findOne({ userId: owner, running: true });
  if (!running) return null;

  const task = await TaskModel.findOne({ _id: running.taskId, tenantId: context.tenantId });

  const startedAt = running.startedAt ?? running.createdAt;

  return {
    entryId: String(running._id),
    taskId: String(running.taskId),
    taskNumber: task?.number ?? '',
    taskTitle: task?.title ?? 'Unknown task',
    startedAt,
    elapsedMinutes: Math.floor((Date.now() - startedAt.getTime()) / 60000),
  };
}

/** Total time recorded against one task, by everyone. */
export async function loggedMinutesForTask(taskId: string): Promise<number> {
  await connectToDatabase();

  const found = await entries().find({ taskId: toObjectId(taskId) });

  return found.reduce((sum, entry) => sum + (entry.minutes ?? 0), 0);
}

export async function startTimer(taskId: string): Promise<void> {
  await connectToDatabase();

  const context = getContext();

  const task = await TaskModel.findOne({
    _id: toObjectId(taskId),
    tenantId: context.tenantId,
    deletedAt: null,
  });

  if (!task) throw new Error('Task not found.');

  // Starting a second timer stops the first rather than refusing, because that is what the person
  // means: they have moved on to something else.
  const running = await entries().findOne({ userId: context.userId, running: true });
  if (running) {
    await stopTimer(String(running._id));
  }

  const now = new Date();
  await assertWeekOpen(now);

  await entries().create({
    userId: context.userId,
    taskId: task._id,
    spaceId: task.spaceId,
    organisationId: task.organisationId ?? null,
    workDate: startOfDay(now),
    startedAt: now,
    running: true,
    source: 'timer',
    minutes: 0,
  });

  await recordAudit({
    action: 'time.timer_started',
    entityType: 'Task',
    entityId: task._id,
    after: { task: task.number },
  });
}

export async function stopTimer(entryId?: string): Promise<void> {
  await connectToDatabase();

  const context = getContext();

  const running = entryId
    ? await entries().findById(entryId)
    : await entries().findOne({ userId: context.userId, running: true });

  if (!running) return;

  const startedAt = running.startedAt ?? running.createdAt;
  const minutes = Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60000));

  await entries().updateOne(
    { _id: running._id },
    { $set: { running: false, endedAt: new Date(), minutes } },
  );

  await recordAudit({
    action: 'time.timer_stopped',
    entityType: 'TimeEntry',
    entityId: running._id,
    after: { minutes },
  });
}

export interface ManualEntryInput {
  taskId: string;
  workDate: string;
  duration: number;
  note?: string;
  billable?: boolean;
}

export async function addManualEntry(input: ManualEntryInput): Promise<void> {
  await connectToDatabase();

  const context = getContext();

  if (input.duration <= 0) {
    throw new Error('Enter how long the work took, for example 1.5 or 1:30.');
  }

  const task = await TaskModel.findOne({
    _id: toObjectId(input.taskId),
    tenantId: context.tenantId,
    deletedAt: null,
  });

  if (!task) throw new Error('Task not found.');

  const workDate = startOfDay(new Date(input.workDate));
  await assertWeekOpen(workDate);

  const created = await entries().create({
    userId: context.userId,
    taskId: task._id,
    spaceId: task.spaceId,
    organisationId: task.organisationId ?? null,
    workDate,
    minutes: input.duration,
    note: input.note?.trim() || null,
    billable: input.billable ?? true,
    source: 'manual',
    running: false,
  });

  await recordAudit({
    action: 'time.entry_added',
    entityType: 'TimeEntry',
    entityId: created._id,
    after: { task: task.number, minutes: created.minutes, date: workDate.toISOString() },
  });
}

export async function updateEntry(
  entryId: string,
  input: { duration: number; note?: string; billable: boolean },
): Promise<void> {
  await connectToDatabase();

  const before = await entries().findById(entryId);
  if (!before) throw new Error('Entry not found.');
  if (before.lockedAt) throw new Error('That week is locked, so the entry cannot be changed.');

  await assertWeekOpen(before.workDate);

  if (input.duration <= 0) {
    throw new Error('Enter how long the work took.');
  }

  const after = await entries().updateOne(
    { _id: before._id },
    {
      $set: {
        minutes: input.duration,
        note: input.note?.trim() || null,
        billable: input.billable,
      },
    },
  );

  // Every edit is recorded, so a corrected timesheet can always be explained.
  await recordAudit({
    action: 'time.entry_edited',
    entityType: 'TimeEntry',
    entityId: before._id,
    ...changedFields(
      { minutes: before.minutes, note: before.note, billable: before.billable },
      { minutes: after?.minutes, note: after?.note, billable: after?.billable },
    ),
  });
}

export async function removeEntry(entryId: string): Promise<void> {
  await connectToDatabase();

  const entry = await entries().findById(entryId);
  if (!entry) throw new Error('Entry not found.');
  if (entry.lockedAt) throw new Error('That week is locked, so the entry cannot be removed.');

  await assertWeekOpen(entry.workDate);
  await entries().softDelete({ _id: entry._id });

  await recordAudit({
    action: 'time.entry_removed',
    entityType: 'TimeEntry',
    entityId: entry._id,
    before: { minutes: entry.minutes, date: entry.workDate.toISOString() },
  });
}

async function assertWeekOpen(date: Date): Promise<void> {
  const { tenantId } = getContext();

  const lock = await WeekLockModel.findOne({
    tenantId,
    weekStart: startOfWeek(date),
    unlockedAt: null,
  });

  if (lock) {
    throw new Error('That week is locked. Ask an administrator to unlock it.');
  }
}
