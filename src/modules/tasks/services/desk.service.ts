import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { toObjectId } from '@/lib/ids';
import { DeskEntryModel } from '../models/desk-entry.model';
import { DeskSnapshotModel } from '../models/desk-snapshot.model';
import { getTask, listTasks, type TaskSummary } from './task.service';

import { nextOfficeDate, officeDate, officeInstant } from '../office-day';

/** The configured completion flag determines whether a desk task is finished. Shared so the
 * archival and the score always agree on what "done" means. */
export function isDeskTaskDone(task: TaskSummary) {
  return task.isClosed;
}

export async function listDeskTaskIds() {
  await connectToDatabase();
  const context = getContext();
  return (
    await DeskEntryModel.find({ tenantId: context.tenantId, userId: context.userId }).select(
      'taskId',
    )
  ).map((entry) => String(entry.taskId));
}

export async function setDeskTaskSelected(taskId: string, selected: boolean) {
  await connectToDatabase();
  const context = getContext();
  const filter = { tenantId: context.tenantId, userId: context.userId, taskId: toObjectId(taskId) };
  if (!selected) {
    await DeskEntryModel.deleteMany(filter);
    return;
  }
  const task = await getTask(taskId);
  if (!task || !task.assigneeIds.some((id) => String(id) === String(context.userId)))
    throw new Error('Only a task assigned to you can be put on your desk.');
  await DeskEntryModel.updateOne(filter, { $setOnInsert: filter }, { upsert: true });
}

export async function toggleDeskTask(taskId: string) {
  const ids = await listDeskTaskIds();
  await setDeskTaskSelected(taskId, !ids.includes(taskId));
}

export async function loadMyDesk() {
  await connectToDatabase();
  const userId = getContext().userId;
  const entries = await DeskEntryModel.find({ tenantId: getContext().tenantId, userId });
  const ids = new Set(entries.map((e) => String(e.taskId)));
  const tasks = (await listTasks({ includeClosed: true })).filter((t) => ids.has(t.id));
  return { tasks, selectedIds: [...ids], score: score(tasks) };
}

export type DeskHistoryItem = {
  id: string;
  workDate: string;
  taskCount: number;
  completedOnTime: number;
  overdue: number;
  dueTomorrowNotStarted: number;
  dueSoonInProgress: number;
};

/** Daily desk summaries belong only to the signed-in user. The score is deliberately
 * excluded here until the performance algorithm has been agreed. */
export async function listMyDeskHistory(limit = 60): Promise<DeskHistoryItem[]> {
  await connectToDatabase();
  const context = getContext();
  const snapshots = await DeskSnapshotModel.find({
    tenantId: context.tenantId,
    userId: context.userId,
  })
    .sort({ workDate: -1 })
    .limit(limit)
    .lean();
  return snapshots.map((snapshot) => ({
    id: String(snapshot._id),
    workDate: snapshot.workDate,
    taskCount: snapshot.taskIds.length,
    completedOnTime: snapshot.completedOnTime,
    overdue: snapshot.overdue,
    dueTomorrowNotStarted: snapshot.dueTomorrowNotStarted,
    dueSoonInProgress: snapshot.dueSoonInProgress,
  }));
}

export function score(tasks: TaskSummary[], now = new Date()) {
  const workDate = officeDate(now);
  const tomorrowDate = nextOfficeDate(workDate);
  const tomorrow = officeInstant(tomorrowDate, 0, 0, 0);
  const followingDay = officeInstant(nextOfficeDate(tomorrowDate), 0, 0, 0);
  const todayStart = officeInstant(workDate, 0, 0, 0);
  const done = isDeskTaskDone;
  const completedOnTime = tasks.filter((t) => done(t) && (!t.endAt || t.endAt >= now)).length;
  const overdue = tasks.filter((t) => !done(t) && t.endAt && t.endAt < now).length;
  const dueToday = tasks.filter(
    (t) => !done(t) && t.endAt && t.endAt >= todayStart && t.endAt < tomorrow,
  ).length;
  const dueTomorrowNotStarted = tasks.filter(
    (t) =>
      !done(t) &&
      t.endAt &&
      t.endAt >= tomorrow &&
      t.endAt < followingDay &&
      /to do/i.test(t.status),
  ).length;
  const dueSoonInProgress = tasks.filter(
    (t) =>
      !done(t) &&
      t.endAt &&
      t.endAt >= now &&
      t.endAt < tomorrow &&
      /progress|doing|working/i.test(t.status),
  ).length;
  // A score is earned from the tasks deliberately committed to the desk. It never starts at 100:
  // an unfinished desk is 0, and a finished on-time task earns its share of the day.
  const value = tasks.length
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            (completedOnTime * 100 -
              overdue * 30 -
              dueTomorrowNotStarted * 10 -
              dueSoonInProgress * 5) /
              tasks.length,
          ),
        ),
      )
    : 0;
  return { completedOnTime, overdue, dueToday, dueTomorrowNotStarted, dueSoonInProgress, value };
}

/**
 * "I am done" for the day. Completed desk tasks are archived into today's Performance History and
 * removed from the active desk; incomplete tasks stay on the desk for the next day, with their
 * current condition recorded in the same snapshot. Confirming again on the same day accumulates
 * newly completed tasks into that day's record rather than overwriting it. The automatic
 * office-day close calls this too (see desk-close.service).
 */
export async function finishMyDesk(at = new Date()) {
  const workDate = officeDate(at);
  await connectToDatabase();
  const context = getContext();
  const desk = await loadMyDesk();
  const completed = desk.tasks.filter(isDeskTaskDone);
  const incomplete = desk.tasks.filter((task) => !isDeskTaskDone(task));

  // Accumulate, never overwrite: fold the newly completed tasks into whatever today's snapshot
  // already archived.
  const existing = await DeskSnapshotModel.findOne({
    tenantId: context.tenantId,
    userId: context.userId,
    workDate,
  }).lean();
  const archivedIds = new Set<string>((existing?.taskIds ?? []).map((id) => String(id)));
  for (const task of completed) archivedIds.add(task.id);

  // The day's record covers the whole committed desk: the tasks now archived plus the incomplete
  // tasks that carry over, so the counters describe the day rather than only what is left.
  const known = await listTasks({ includeClosed: true });
  const archivedTasks = known.filter((task) => archivedIds.has(task.id));
  const dayTasks = [...archivedTasks, ...incomplete];
  const result = score(dayTasks, at);

  await DeskSnapshotModel.findOneAndUpdate(
    { tenantId: context.tenantId, userId: context.userId, workDate },
    {
      $set: {
        score: result.value,
        completedOnTime: result.completedOnTime,
        overdue: result.overdue,
        dueTomorrowNotStarted: result.dueTomorrowNotStarted,
        dueSoonInProgress: result.dueSoonInProgress,
        taskIds: [...archivedIds].map((id) => toObjectId(id)),
      },
    },
    { upsert: true },
  );

  // Completed tasks leave the active desk; incomplete tasks remain for the next day.
  if (completed.length)
    await DeskEntryModel.deleteMany({
      tenantId: context.tenantId,
      userId: context.userId,
      taskId: { $in: completed.map((task) => toObjectId(task.id)) },
    });

  return result;
}
