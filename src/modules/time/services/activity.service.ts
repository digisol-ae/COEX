import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { repository } from '@/lib/repository';
import { toObjectId } from '@/lib/ids';
import { UserModel } from '@/modules/core/models/user.model';
import { TaskModel } from '@/modules/tasks/models/task.model';
import { SpaceModel } from '@/modules/tasks/models/space.model';
import { TicketModel } from '@/modules/tickets/models/ticket.model';
import { TimeEntryModel } from '../models/time-entry.model';

/**
 * Who is working on what (John, 9 Oct 2026): one row per person and task or ticket, with the stage
 * it is in now and the time they put on it in the chosen days. Built only from recorded time, so
 * someone working without a timer is not shown; the page says so. Callers check the permission
 * (`timesheet.read.all`), because who sees other people's hours is decided there.
 */

const entries = () => repository(TimeEntryModel);

export interface ActivityFilter {
  /** Calendar days, YYYY-MM-DD, both inclusive. */
  fromDay: string;
  toDay: string;
  /** Limit to these people; empty or missing means everyone. */
  userIds?: string[];
  /** Which kinds to include; missing means both. */
  kinds?: ('task' | 'ticket')[];
  /** A task stage name or a ticket status, matched against the item's current stage. */
  status?: string;
}

export interface ActivityRow {
  userId: string;
  userName: string;
  kind: 'task' | 'ticket';
  itemId: string;
  number: string;
  title: string;
  /** Where it is now: the task's stage name, or the ticket's status key. */
  status: string;
  /** Space name for a task; null for a ticket. */
  context: string | null;
  minutes: number;
  running: boolean;
  lastWorkedAt: Date;
}

export async function listTeamActivity(filter: ActivityFilter): Promise<ActivityRow[]> {
  await connectToDatabase();
  const { tenantId } = getContext();

  const from = new Date(`${filter.fromDay}T00:00:00+04:00`);
  // Through the end of the last day, so a work date stored at any hour of that day is included.
  const until = new Date(new Date(`${filter.toDay}T00:00:00+04:00`).getTime() + 24 * 3600 * 1000);

  const found = await entries().find({
    workDate: { $gte: from, $lt: until },
    ...(filter.userIds?.length ? { userId: { $in: filter.userIds.map(toObjectId) } } : {}),
  });

  const [people, tasks, tickets] = await Promise.all([
    UserModel.find({ tenantId, _id: { $in: found.map((entry) => entry.userId) } }).select('name'),
    TaskModel.find({
      tenantId,
      _id: { $in: found.filter((entry) => entry.taskId).map((entry) => entry.taskId) },
    }).select('number title status spaceId'),
    TicketModel.find({
      tenantId,
      _id: { $in: found.filter((entry) => entry.ticketId).map((entry) => entry.ticketId) },
    }).select('number subject status'),
  ]);
  const spaces = await SpaceModel.find({
    tenantId,
    _id: { $in: tasks.map((task) => task.spaceId) },
  }).select('name');

  const personName = new Map(people.map((person) => [String(person._id), person.name]));
  const spaceName = new Map(spaces.map((space) => [String(space._id), space.name]));
  const taskById = new Map(tasks.map((task) => [String(task._id), task]));
  const ticketById = new Map(tickets.map((ticket) => [String(ticket._id), ticket]));

  const rows = new Map<string, ActivityRow>();

  for (const entry of found) {
    const kind = entry.taskId ? 'task' : 'ticket';
    if (filter.kinds && !filter.kinds.includes(kind)) continue;
    const itemId = String(entry.taskId ?? entry.ticketId);
    const task = kind === 'task' ? taskById.get(itemId) : undefined;
    const ticket = kind === 'ticket' ? ticketById.get(itemId) : undefined;
    if (!task && !ticket) continue;

    const startedAt = entry.startedAt ?? entry.createdAt;
    const minutes = entry.running
      ? Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 60000))
      : (entry.minutes ?? 0);
    const touchedAt = entry.running ? new Date() : (entry.endedAt ?? entry.updatedAt ?? startedAt);

    const key = `${entry.userId}:${kind}:${itemId}`;
    const existing = rows.get(key);

    rows.set(key, {
      userId: String(entry.userId),
      userName: personName.get(String(entry.userId)) ?? 'Unknown',
      kind,
      itemId,
      number: (task?.number ?? ticket?.number) as string,
      title: (task?.title ?? ticket?.subject) as string,
      status: (task?.status ?? ticket?.status) as string,
      context: task ? (spaceName.get(String(task.spaceId)) ?? null) : null,
      minutes: (existing?.minutes ?? 0) + minutes,
      running: (existing?.running ?? false) || Boolean(entry.running),
      lastWorkedAt:
        existing && existing.lastWorkedAt > touchedAt ? existing.lastWorkedAt : touchedAt,
    });
  }

  return [...rows.values()]
    .filter((row) => !filter.status || row.status === filter.status)
    .sort(
      (a, b) =>
        Number(b.running) - Number(a.running) ||
        a.userName.localeCompare(b.userName) ||
        b.minutes - a.minutes,
    );
}
