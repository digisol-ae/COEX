import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { toObjectId } from '@/lib/ids';
import { DeskEntryModel } from '../models/desk-entry.model';
import { DeskSnapshotModel } from '../models/desk-snapshot.model';
import { getTask, listTasks, type TaskSummary } from './task.service';

function day(date = new Date()) { return date.toISOString().slice(0, 10); }
function startTomorrow() { const d = new Date(); d.setHours(24, 0, 0, 0); return d; }

export async function toggleDeskTask(taskId: string) {
  await connectToDatabase();
  const userId = getContext().userId;
  const existing = await DeskEntryModel.findOne({ tenantId: getContext().tenantId, userId, taskId: toObjectId(taskId) });
  // A task may have been reassigned after it was placed on the desk. Its former owner must still
  // be able to remove their own desk entry; the assignment rule applies only when adding.
  if (existing) {
    await DeskEntryModel.deleteOne({ _id: existing._id });
    return;
  }
  const task = await getTask(taskId);
  if (!task || !task.assigneeIds.some((id) => String(id) === String(getContext().userId)))
    throw new Error('Only a task assigned to you can be put on your desk.');
  await DeskEntryModel.create({ tenantId: getContext().tenantId, userId, taskId: toObjectId(taskId) });
}

export async function loadMyDesk() {
  await connectToDatabase();
  const userId = getContext().userId;
  const entries = await DeskEntryModel.find({ tenantId: getContext().tenantId, userId });
  const ids = new Set(entries.map(e => String(e.taskId)));
  const tasks = (await listTasks({ includeClosed: true })).filter(t => ids.has(t.id));
  return { tasks, selectedIds: [...ids], score: score(tasks) };
}

export function score(tasks: TaskSummary[]) {
  const now = new Date(); const tomorrow = startTomorrow();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const done = (task: TaskSummary) => task.isClosed || /done|complete|closed|resolved/i.test(task.status);
  const completedOnTime = tasks.filter(t => done(t) && (!t.endAt || t.endAt >= now)).length;
  const overdue = tasks.filter(t => !done(t) && t.endAt && t.endAt < now).length;
  const dueToday = tasks.filter(t => !done(t) && t.endAt && t.endAt >= todayStart && t.endAt < tomorrow).length;
  const dueTomorrowNotStarted = tasks.filter(t => !done(t) && t.endAt && t.endAt >= tomorrow && t.endAt < new Date(tomorrow.getTime()+86400000) && /to do/i.test(t.status)).length;
  const dueSoonInProgress = tasks.filter(t => !done(t) && t.endAt && t.endAt >= now && t.endAt < tomorrow && /progress|doing|working/i.test(t.status)).length;
  // A score is earned from the tasks deliberately committed to the desk. It never starts at 100:
  // an unfinished desk is 0, and a finished on-time task earns its share of the day.
  const value = tasks.length
    ? Math.max(0, Math.min(100, Math.round((completedOnTime * 100 - overdue * 30 - dueTomorrowNotStarted * 10 - dueSoonInProgress * 5) / tasks.length)))
    : 0;
  return { completedOnTime, overdue, dueToday, dueTomorrowNotStarted, dueSoonInProgress, value };
}

export async function finishMyDesk() {
  const desk = await loadMyDesk(); const result = desk.score; const context = getContext();
  await DeskSnapshotModel.findOneAndUpdate({ tenantId: context.tenantId, userId: context.userId, workDate: day() }, { $set: { score: result.value, completedOnTime: result.completedOnTime, overdue: result.overdue, dueTomorrowNotStarted: result.dueTomorrowNotStarted, dueSoonInProgress: result.dueSoonInProgress, taskIds: desk.tasks.map(t => toObjectId(t.id)) } }, { upsert: true });
  return result;
}
