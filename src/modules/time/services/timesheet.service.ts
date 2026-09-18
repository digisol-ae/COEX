import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { repository } from '@/lib/repository';
import { toObjectId } from '@/lib/ids';
import { recordAudit } from '@/modules/core/services/audit.service';
import { UserModel } from '@/modules/core/models/user.model';
import { TaskModel } from '@/modules/tasks/models/task.model';
import { SpaceModel } from '@/modules/tasks/models/space.model';
import { OrganisationModel } from '@/modules/crm/models/organisation.model';
import { TimeEntryModel } from '../models/time-entry.model';
import { WeekLockModel } from '../models/week-lock.model';
import { AuditLogModel } from '@/modules/core/models/audit-log.model';
import { endOfWeek, startOfWeek } from '../week';
import { toDateKey } from '../week';

/** Reading time back: one person's week, and totals by space, person and customer. */

const entries = () => repository(TimeEntryModel);

export interface TimesheetEntry {
  id: string;
  taskId: string;
  taskNumber: string;
  taskTitle: string;
  spaceName: string;
  organisationName: string | null;
  workDate: Date;
  minutes: number;
  note: string | null;
  billable: boolean;
  running: boolean;
  locked: boolean;
  /** True once the entry has been corrected, so the row can offer its own history. */
  edited: boolean;
}

export interface Timesheet {
  weekStart: Date;
  locked: boolean;
  userId: string;
  userName: string;
  entries: TimesheetEntry[];
  totalMinutes: number;
  billableMinutes: number;
  byDay: { date: Date; minutes: number }[];
}

export async function loadTimesheet(week: Date, userId?: string): Promise<Timesheet> {
  await connectToDatabase();

  const context = getContext();
  const owner = userId ? toObjectId(userId) : context.userId;
  const weekStart = startOfWeek(week);

  const found = await entries()
    .find({ userId: owner, workDate: { $gte: weekStart, $lt: endOfWeek(week) } })
    .sort({ workDate: 1, createdAt: 1 });

  const [tasks, spaces, organisations, user, lock, edits] = await Promise.all([
    TaskModel.find({ _id: { $in: found.map((entry) => entry.taskId) } }).select('number title'),
    SpaceModel.find({ _id: { $in: found.map((entry) => entry.spaceId) } }).select('name'),
    OrganisationModel.find({
      _id: { $in: found.map((entry) => entry.organisationId).filter(Boolean) },
    }).select('name'),
    UserModel.findOne({ _id: owner }).select('name'),
    WeekLockModel.findOne({ tenantId: context.tenantId, weekStart, unlockedAt: null }),
    // One query for the whole week rather than one per row: the flag only decides whether a row
    // offers its history, and forty extra reads for a marker would not be worth it.
    AuditLogModel.find({
      tenantId: context.tenantId,
      entityType: 'TimeEntry',
      action: 'time.entry_edited',
      entityId: { $in: found.map((entry) => entry._id) },
    }).select('entityId'),
  ]);

  const editedIds = new Set(edits.map((row) => String(row.entityId)));

  const taskById = new Map(tasks.map((task) => [String(task._id), task]));
  const spaceById = new Map(spaces.map((space) => [String(space._id), space.name]));
  const organisationById = new Map(
    organisations.map((organisation) => [String(organisation._id), organisation.name]),
  );

  const rows: TimesheetEntry[] = found.map((entry) => ({
    id: String(entry._id),
    taskId: String(entry.taskId),
    taskNumber: taskById.get(String(entry.taskId))?.number ?? '',
    taskTitle: taskById.get(String(entry.taskId))?.title ?? 'Unknown task',
    spaceName: spaceById.get(String(entry.spaceId)) ?? 'Unknown space',
    organisationName: entry.organisationId
      ? (organisationById.get(String(entry.organisationId)) ?? null)
      : null,
    workDate: entry.workDate,
    minutes: entry.minutes ?? 0,
    note: entry.note ?? null,
    billable: entry.billable ?? true,
    running: entry.running ?? false,
    locked: Boolean(lock),
    edited: editedIds.has(String(entry._id)),
  }));

  const byDay = new Map<string, number>();
  for (const row of rows) {
    const key = toDateKey(row.workDate);
    byDay.set(key, (byDay.get(key) ?? 0) + row.minutes);
  }

  return {
    weekStart,
    locked: Boolean(lock),
    userId: String(owner),
    userName: user?.name ?? 'Unknown',
    entries: rows,
    totalMinutes: rows.reduce((sum, row) => sum + row.minutes, 0),
    billableMinutes: rows.reduce((sum, row) => sum + (row.billable ? row.minutes : 0), 0),
    byDay: [...byDay.entries()]
      .map(([date, minutes]) => ({ date: new Date(date), minutes }))
      .sort((a, b) => a.date.getTime() - b.date.getTime()),
  };
}

export interface TimeTotals {
  byPerson: { id: string; label: string; minutes: number; billableMinutes: number }[];
  bySpace: { id: string; label: string; minutes: number; billableMinutes: number }[];
  byCustomer: { id: string; label: string; minutes: number; billableMinutes: number }[];
  totalMinutes: number;
  billableMinutes: number;
}

/**
 * Totals for a period, grouped three ways.
 *
 * Aggregation runs in MongoDB rather than in the application, so a year of entries does not have
 * to travel across the wire to be added up.
 */
export async function loadTotals(from: Date, to: Date): Promise<TimeTotals> {
  await connectToDatabase();

  const { tenantId } = getContext();
  const match = { tenantId, deletedAt: null, workDate: { $gte: from, $lt: to } };

  async function group(field: string) {
    return TimeEntryModel.aggregate<{
      _id: unknown;
      minutes: number;
      billableMinutes: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: `$${field}`,
          minutes: { $sum: '$minutes' },
          billableMinutes: { $sum: { $cond: ['$billable', '$minutes', 0] } },
        },
      },
      { $sort: { minutes: -1 } },
    ]);
  }

  const [people, spaces, customers] = await Promise.all([
    group('userId'),
    group('spaceId'),
    group('organisationId'),
  ]);

  const [users, spaceDocs, organisationDocs] = await Promise.all([
    UserModel.find({ _id: { $in: people.map((row) => row._id) } }).select('name'),
    SpaceModel.find({ _id: { $in: spaces.map((row) => row._id) } }).select('name'),
    OrganisationModel.find({
      _id: { $in: customers.map((row) => row._id).filter(Boolean) },
    }).select('name'),
  ]);

  const nameOf = (docs: { _id: unknown; name: string }[], id: unknown, fallback: string): string =>
    docs.find((doc) => String(doc._id) === String(id))?.name ?? fallback;

  return {
    byPerson: people.map((row) => ({
      id: String(row._id),
      label: nameOf(users, row._id, 'Unknown'),
      minutes: row.minutes,
      billableMinutes: row.billableMinutes,
    })),
    bySpace: spaces.map((row) => ({
      id: String(row._id),
      label: nameOf(spaceDocs, row._id, 'Unknown space'),
      minutes: row.minutes,
      billableMinutes: row.billableMinutes,
    })),
    byCustomer: customers.map((row) => ({
      id: String(row._id ?? ''),
      label: row._id ? nameOf(organisationDocs, row._id, 'Unknown') : 'No customer',
      minutes: row.minutes,
      billableMinutes: row.billableMinutes,
    })),
    totalMinutes: people.reduce((sum, row) => sum + row.minutes, 0),
    billableMinutes: people.reduce((sum, row) => sum + row.billableMinutes, 0),
  };
}

export async function lockWeek(week: Date): Promise<void> {
  await connectToDatabase();

  const context = getContext();
  const weekStart = startOfWeek(week);

  await WeekLockModel.findOneAndUpdate(
    { tenantId: context.tenantId, weekStart },
    {
      $set: {
        lockedById: context.userId,
        lockedAt: new Date(),
        unlockedAt: null,
        unlockedById: null,
        unlockReason: null,
      },
    },
    { upsert: true },
  );

  await TimeEntryModel.updateMany(
    { tenantId: context.tenantId, workDate: { $gte: weekStart, $lt: endOfWeek(week) } },
    { $set: { lockedAt: new Date(), running: false } },
  );

  await recordAudit({
    action: 'time.week_locked',
    entityType: 'WeekLock',
    after: { weekStart: weekStart.toISOString() },
  });
}

export async function unlockWeek(week: Date, reason: string): Promise<void> {
  await connectToDatabase();

  const context = getContext();
  const weekStart = startOfWeek(week);

  if (!reason.trim()) {
    throw new Error('Give a reason for unlocking the week. It is recorded.');
  }

  await WeekLockModel.updateOne(
    { tenantId: context.tenantId, weekStart },
    { $set: { unlockedById: context.userId, unlockedAt: new Date(), unlockReason: reason.trim() } },
  );

  await TimeEntryModel.updateMany(
    { tenantId: context.tenantId, workDate: { $gte: weekStart, $lt: endOfWeek(week) } },
    { $set: { lockedAt: null } },
  );

  await recordAudit({
    action: 'time.week_unlocked',
    entityType: 'WeekLock',
    after: { weekStart: weekStart.toISOString(), reason: reason.trim() },
  });
}
