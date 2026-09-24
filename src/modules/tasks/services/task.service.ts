import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { repository } from '@/lib/repository';
import { toObjectId, toOptionalObjectId } from '@/lib/ids';
import { recordAudit, changedFields } from '@/modules/core/services/audit.service';
import { nextNumber } from '@/modules/core/services/numbering.service';
import { recordActivity } from '@/modules/crm/services/activity.service';
import { UserModel } from '@/modules/core/models/user.model';
import { TaskModel } from '../models/task.model';
import { TaskCommentModel } from '../models/task-comment.model';
import { SpaceModel } from '../models/space.model';
import { FolderModel } from '../models/folder.model';
import { TimeEntryModel } from '@/modules/time/models/time-entry.model';
import { assignableMemberIds, canOpenFolder, visibleFolderFilter } from './folder.service';
import { assignableSpaceMemberIds, canOpenSpace, visibleSpaceFilter } from './space.service';
import { parseDocumentLink } from '../document-links';
import { TenantModel } from '@/modules/core/models/tenant.model';
import {
  DEFAULT_CALENDAR,
  workingMinutesBetween,
  type WorkingCalendar,
} from '@/modules/tickets/business-hours';
import { TicketModel } from '@/modules/tickets/models/ticket.model';
import { TicketMessageModel } from '@/modules/tickets/models/ticket-message.model';

/**
 * Tasks.
 *
 * isClosed is denormalised from the space's column configuration whenever the status changes, so
 * the dashboard counts open work with one indexed query rather than joining to the space on
 * every tile. lastActivityAt is touched on every meaningful change, which is what the ageing view
 * reads.
 */

const tasks = () => repository(TaskModel);
const taskComments = () => repository(TaskCommentModel);

/**
 * Planned hours come from the working calendar, not from elapsed time.
 *
 * A task planned from Monday morning to Wednesday evening is three working days of about eight
 * hours, not the fifty six hours a clock would report. Anything else makes planned hours useless
 * next to logged hours.
 */
async function plannedMinutesFor(startAt: Date | null, endAt: Date | null): Promise<number | null> {
  if (!startAt || !endAt || endAt <= startAt) return null;

  const tenant = await TenantModel.findOne({ _id: getContext().tenantId });

  const calendar: WorkingCalendar = {
    workingDays: tenant?.workingDays?.length ? tenant.workingDays : DEFAULT_CALENDAR.workingDays,
    dayStartMinutes: tenant?.dayStartMinutes ?? DEFAULT_CALENDAR.dayStartMinutes,
    dayEndMinutes: tenant?.dayEndMinutes ?? DEFAULT_CALENDAR.dayEndMinutes,
  };

  return workingMinutesBetween(startAt, endAt, calendar);
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type Priority = 'urgent' | 'high' | 'normal' | 'low';

export interface TaskSummary {
  id: string;
  number: string;
  title: string;
  status: string;
  priority: Priority;
  spaceId: string;
  spaceName: string;
  folderId: string | null;
  folderName: string | null;
  assigneeIds: string[];
  assigneeNames: string[];
  startAt: Date | null;
  endAt: Date | null;
  plannedMinutes: number | null;
  estimateMinutes: number | null;
  sortOrder: number;
  subtaskCount: number;
  subtasksDone: number;
  subtasks: { id: string; title: string; done: boolean; assigneeId: string | null }[];
  documentCount: number;
  documentLinks: { id: string; title: string; url: string }[];
  loggedMinutes: number;
  isClosed: boolean;
  isOverdue: boolean;
  lastActivityAt: Date;
}

export interface TaskFilter {
  spaceId?: string;
  folderId?: string;
  assigneeId?: string;
  status?: string;
  includeClosed?: boolean;
  overdueOnly?: boolean;
  unassignedOnly?: boolean;
}

export async function listTasks(filter: TaskFilter = {}): Promise<TaskSummary[]> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};

  if (filter.spaceId) query.spaceId = toObjectId(filter.spaceId);
  if (filter.folderId) query.folderId = toObjectId(filter.folderId);
  if (filter.assigneeId) query.assigneeIds = toObjectId(filter.assigneeId);
  if (filter.status) query.status = filter.status;
  if (!filter.includeClosed) query.isClosed = false;
  if (filter.overdueOnly) query.endAt = { $lt: new Date() };
  if (filter.unassignedOnly) query.assigneeIds = { $size: 0 };

  // Private folders are filtered here rather than in a screen, so nothing that reads tasks can
  // forget to apply it.
  const found = await tasks()
    .find({ ...query, ...(await visibleFolderFilter()), ...(await visibleSpaceFilter('spaceId')) })
    .sort({ sortOrder: 1, endAt: 1, createdAt: -1 });

  const spaceNames = new Map(
    (await SpaceModel.find({ tenantId: getContext().tenantId, deletedAt: null })).map((space) => [
      String(space._id),
      space.name,
    ]),
  );

  const folderNames = new Map(
    (await FolderModel.find({ tenantId: getContext().tenantId, deletedAt: null })).map((folder) => [
      String(folder._id),
      folder.name,
    ]),
  );

  const assigneeIds = [
    ...new Set(found.flatMap((task) => task.assigneeIds.map((id) => String(id)))),
  ];
  const users = await UserModel.find({ _id: { $in: assigneeIds } }).select('name');
  const names = new Map(users.map((user) => [String(user._id), user.name]));

  // Batched the same way documentCount and subtaskCount are, so a list of a hundred tasks costs
  // one extra query rather than one per task. A running entry has not yet had its minutes written,
  // so its live elapsed time is added in here rather than waiting for it to stop.
  const timeEntries = await TimeEntryModel.find({
    tenantId: getContext().tenantId,
    taskId: { $in: found.map((task) => task._id) },
    deletedAt: null,
  }).select('taskId minutes running startedAt createdAt');

  const nowMs = Date.now();
  const loggedByTask = new Map<string, number>();

  for (const entry of timeEntries) {
    const key = String(entry.taskId);
    const startedAt = entry.startedAt ?? entry.createdAt;
    const minutes = entry.running
      ? Math.max(0, Math.floor((nowMs - startedAt.getTime()) / 60000))
      : (entry.minutes ?? 0);

    loggedByTask.set(key, (loggedByTask.get(key) ?? 0) + minutes);
  }

  const now = new Date();

  return found.map((task) => ({
    id: String(task._id),
    number: task.number,
    title: task.title,
    status: task.status,
    priority: task.priority as Priority,
    spaceId: String(task.spaceId),
    spaceName: spaceNames.get(String(task.spaceId)) ?? 'Unknown',
    folderId: task.folderId ? String(task.folderId) : null,
    folderName: task.folderId ? (folderNames.get(String(task.folderId)) ?? null) : null,
    assigneeIds: task.assigneeIds.map((id) => String(id)),
    assigneeNames: task.assigneeIds.map((id) => names.get(String(id)) ?? 'Unknown'),
    startAt: task.startAt ?? null,
    endAt: task.endAt ?? null,
    plannedMinutes: task.plannedMinutes ?? null,
    estimateMinutes: task.estimateMinutes ?? null,
    sortOrder: task.sortOrder ?? 0,
    subtaskCount: task.subtasks.length,
    subtasksDone: task.subtasks.filter((subtask) => subtask.done).length,
    subtasks: task.subtasks.map((subtask) => ({
      id: String(subtask._id),
      title: subtask.title,
      done: subtask.done,
      assigneeId: subtask.assigneeId ? String(subtask.assigneeId) : null,
    })),
    documentCount: task.documentLinks.length,
    documentLinks: task.documentLinks.map((link) => ({
      id: String(link._id),
      title: link.title,
      url: link.url,
    })),
    loggedMinutes: loggedByTask.get(String(task._id)) ?? 0,
    isClosed: task.isClosed ?? false,
    isOverdue: !task.isClosed && !!task.endAt && task.endAt < now,
    lastActivityAt: task.lastActivityAt ?? task.updatedAt,
  }));
}

/**
 * How much open work is mine, for the badge on the rail.
 *
 * One counted query on an indexed field, because this runs on every page load and a badge is never
 * worth a slow screen.
 */
export async function countMyOpenTasks(userId: string): Promise<number> {
  await connectToDatabase();

  return tasks().count({ assigneeIds: toObjectId(userId), isClosed: false });
}

export async function getTask(id: string) {
  await connectToDatabase();
  const task = await tasks().findById(id);
  if (!task || !(await canOpenSpace(String(task.spaceId)))) return null;
  if (task.folderId && !(await canOpenFolder(String(task.folderId)))) return null;
  return task;
}

export interface TaskCommentView {
  id: string;
  body: string;
  authorName: string;
  createdAt: Date;
}

/**
 * The ticket a task was escalated from. Tasks escalated before sourceTicketId was written only
 * carry the link on the ticket side, so fall back to that rather than silently dropping updates.
 */
async function sourceTicketIdFor(task: {
  _id: Types.ObjectId;
  sourceTicketId?: Types.ObjectId | null;
}): Promise<Types.ObjectId | null> {
  if (task.sourceTicketId) return task.sourceTicketId;
  const ticket = await TicketModel.findOne({
    tenantId: getContext().tenantId,
    escalatedTaskId: task._id,
  })
    .select('_id')
    .lean<{ _id: Types.ObjectId }>();
  return ticket?._id ?? null;
}

/** Task notes are internal work updates, never customer-facing messages. */
export async function listTaskComments(taskId: string): Promise<TaskCommentView[]> {
  const task = await getTask(taskId);
  if (!task) return [];

  const found = await taskComments()
    .find({ taskId: toObjectId(taskId) })
    .sort({ createdAt: 1 });

  return found.map((comment) => ({
    id: String(comment._id),
    body: comment.body,
    authorName: comment.authorName,
    createdAt: comment.createdAt,
  }));
}

/**
 * Records a task update and mirrors it into its source ticket as an internal note. That mirror is
 * intentionally one-way: task work may inform support staff, but it must never email a customer.
 */
export async function addTaskComment(taskId: string, body: string): Promise<void> {
  const text = body.trim();
  if (!text) throw new Error('Write a comment before posting it.');
  if (text.length > 4_000) throw new Error('A comment can be up to 4,000 characters.');

  const task = await getTask(taskId);
  if (!task) throw new Error('Task not found.');

  const context = getContext();
  const author = await UserModel.findOne({
    _id: context.userId,
    tenantId: context.tenantId,
  }).select('name');
  const authorName = author?.name ?? 'Unknown agent';

  await taskComments().create({
    taskId: task._id,
    body: text,
    authorUserId: context.userId,
    authorName,
  });

  await tasks().updateOne({ _id: task._id }, { $set: { lastActivityAt: new Date() } });

  const sourceTicketId = await sourceTicketIdFor(task);
  if (sourceTicketId) {
    const now = new Date();
    await TicketMessageModel.create({
      tenantId: context.tenantId,
      ticketId: sourceTicketId,
      visibility: 'internal',
      direction: 'outbound',
      body: `Task ${task.number} update\n${text}`,
      authorUserId: context.userId,
      authorName,
      channel: 'agent',
    });
    await TicketModel.updateOne(
      { _id: sourceTicketId, tenantId: context.tenantId },
      { $set: { lastActivityAt: now } },
    );
  }
}

export interface CreateTaskInput {
  spaceId: string;
  title: string;
  description?: string;
  priority?: Priority;
  assigneeIds?: string[];
  startAt?: string | null;
  endAt?: string | null;
  estimateMinutes?: number | null;
  organisationId?: string | null;
  folderId?: string | null;
  /** Adding straight into a column, from the board. Anything else opens in the first column. */
  status?: string;
  /** Set when support escalates a ticket, so work updates on the task can reach that ticket. */
  sourceTicketId?: string | null;
}

/**
 * Work inside a private folder can only be given to that folder's members.
 *
 * The alternative is creating a task its own owner cannot open, which is a worse outcome than any
 * refusal, and one nobody would think to look for.
 */
async function assertAssignable(
  folderId: string | null,
  assigneeIds: string[],
  spaceId?: string,
): Promise<void> {
  const spaceAllowed = spaceId ? await assignableSpaceMemberIds(spaceId) : null;
  if (spaceAllowed && assigneeIds.some((id) => !spaceAllowed.includes(id))) {
    throw new Error('That space is private, so work in it can only be assigned to its members.');
  }
  const allowed = await assignableMemberIds(folderId);
  if (!allowed) return;

  const outside = assigneeIds.filter((id) => !allowed.includes(id));

  if (outside.length > 0) {
    throw new Error(
      'That folder is private, so work in it can only go to its members. Add them to the folder first.',
    );
  }
}

/**
 * Who may own this task: the members of its private Space and private Folder, or null when
 * neither is private and anyone in the tenant may. Pickers use it so they never offer a person
 * the service would then refuse.
 */
export async function assignableUserIdsForTask(task: {
  spaceId: Types.ObjectId | string;
  folderId?: Types.ObjectId | string | null;
}): Promise<string[] | null> {
  const [spaceMembers, folderMembers] = await Promise.all([
    assignableSpaceMemberIds(String(task.spaceId)),
    assignableMemberIds(task.folderId ? String(task.folderId) : null),
  ]);
  if (spaceMembers && folderMembers) {
    return spaceMembers.filter((id) => folderMembers.includes(id));
  }
  return spaceMembers ?? folderMembers;
}

/**
 * Who a subtask may go to: the task's own assignees, because a subtask is a slice of their work.
 * An unassigned task falls back to whoever may own the task itself.
 */
export async function assignableUserIdsForSubtask(task: {
  spaceId: Types.ObjectId | string;
  folderId?: Types.ObjectId | string | null;
  assigneeIds: (Types.ObjectId | string)[];
}): Promise<string[] | null> {
  if (task.assigneeIds.length > 0) return task.assigneeIds.map(String);
  return assignableUserIdsForTask(task);
}

export async function createTask(input: CreateTaskInput): Promise<string> {
  await connectToDatabase();

  const space = await SpaceModel.findOne({
    _id: toObjectId(input.spaceId),
    tenantId: getContext().tenantId,
    deletedAt: null,
  });

  if (!space) throw new Error('Space not found.');

  const columns = [...space.statuses].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const column = input.status
    ? columns.find((candidate) => candidate.name === input.status)
    : columns[0];

  if (input.status && !column) {
    throw new Error(`${space.name} has no column called ${input.status}.`);
  }

  const firstColumn = column ?? columns[0];

  await assertAssignable(
    input.folderId ?? null,
    (input.assigneeIds ?? []).filter(Boolean),
    input.spaceId,
  );

  const assigneeIds = (input.assigneeIds ?? []).filter(Boolean).map((id) => toObjectId(id));

  const startAt = toDate(input.startAt);
  const endAt = toDate(input.endAt);

  const created = await tasks().create({
    number: await nextNumber('task'),
    title: input.title.trim(),
    description: input.description?.trim() || null,
    spaceId: space._id,
    folderId: toOptionalObjectId(input.folderId),
    status: firstColumn?.name ?? 'To do',
    priority: input.priority ?? 'normal',
    assigneeIds,
    primaryAssigneeId: assigneeIds[0] ?? null,
    startAt,
    endAt,
    plannedMinutes: await plannedMinutesFor(startAt, endAt),
    estimateMinutes: input.estimateMinutes ?? null,
    sortOrder: Date.now(),
    organisationId: toOptionalObjectId(input.organisationId ?? space.organisationId),
    sourceTicketId: toOptionalObjectId(input.sourceTicketId),
    isClosed: firstColumn?.isClosed ?? false,
    lastActivityAt: new Date(),
    createdById: getContext().userId,
  });

  await recordAudit({
    action: 'task.created',
    entityType: 'Task',
    entityId: created._id,
    after: { number: created.number, title: created.title, space: space.name },
  });

  // A task against a customer belongs on that customer's timeline, which is the whole point of
  // keeping one activity collection.
  if (created.organisationId) {
    await recordActivity({
      organisationId: created.organisationId,
      kind: 'task_created',
      summary: `${created.number} ${created.title}`,
      sourceModule: 'tasks',
      sourceId: created._id,
    });
  }

  return String(created._id);
}

export async function moveTask(id: string, status: string): Promise<void> {
  await connectToDatabase();

  const task = await tasks().findById(id);
  if (!task) throw new Error('Task not found.');

  const space = await SpaceModel.findOne({
    _id: task.spaceId,
    tenantId: getContext().tenantId,
  });

  const column = space?.statuses.find((candidate) => candidate.name === status);
  if (!column) throw new Error('That column does not exist on this space.');

  const wasClosed = task.isClosed ?? false;

  await tasks().updateOne(
    { _id: task._id },
    {
      $set: {
        status: column.name,
        isClosed: column.isClosed ?? false,
        closedAt: column.isClosed ? new Date() : null,
        lastActivityAt: new Date(),
      },
    },
  );

  await recordAudit({
    action: 'task.moved',
    entityType: 'Task',
    entityId: task._id,
    ...changedFields({ status: task.status }, { status: column.name }),
  });

  if (!wasClosed && column.isClosed && task.organisationId) {
    await recordActivity({
      organisationId: task.organisationId,
      kind: 'task_completed',
      summary: `${task.number} ${task.title}`,
      sourceModule: 'tasks',
      sourceId: task._id,
    });
  }

  // Completion is useful to support even when the assignee did not leave a written update.
  // This is an internal system event, never a customer reply.
  const completedTicketId = !wasClosed && column.isClosed ? await sourceTicketIdFor(task) : null;
  if (completedTicketId) {
    const context = getContext();
    await TicketMessageModel.create({
      tenantId: context.tenantId,
      ticketId: completedTicketId,
      visibility: 'internal',
      direction: 'outbound',
      body: `Task ${task.number} marked complete.`,
      authorUserId: context.userId,
      authorName: 'COEX',
      channel: 'system',
    });
    await TicketModel.updateOne(
      { _id: completedTicketId, tenantId: context.tenantId },
      { $set: { lastActivityAt: new Date() } },
    );
  }
}

export interface UpdateTaskInput {
  title: string;
  description?: string;
  priority: Priority;
  assigneeIds: string[];
  startAt?: string | null;
  endAt?: string | null;
  estimateMinutes?: number | null;
  tags?: string[];
  folderId?: string | null;
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<void> {
  await connectToDatabase();

  const before = await tasks().findById(id);
  if (!before) throw new Error('Task not found.');

  await assertAssignable(
    input.folderId !== undefined
      ? (input.folderId ?? null)
      : before.folderId
        ? String(before.folderId)
        : null,
    input.assigneeIds.filter(Boolean),
    String(before.spaceId),
  );

  const assigneeIds = input.assigneeIds.filter(Boolean).map((value) => toObjectId(value));

  const startAt = toDate(input.startAt);
  const endAt = toDate(input.endAt);

  if (startAt && endAt && endAt <= startAt) {
    throw new Error('The end must come after the start.');
  }

  const after = await tasks().updateOne(
    { _id: before._id },
    {
      $set: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        priority: input.priority,
        assigneeIds,
        primaryAssigneeId: assigneeIds[0] ?? null,
        startAt,
        endAt,
        plannedMinutes: await plannedMinutesFor(startAt, endAt),
        estimateMinutes: input.estimateMinutes ?? null,
        tags: input.tags ?? [],
        folderId: toOptionalObjectId(input.folderId),
        lastActivityAt: new Date(),
      },
    },
  );

  await recordAudit({
    action: 'task.updated',
    entityType: 'Task',
    entityId: before._id,
    ...changedFields(
      {
        title: before.title,
        priority: before.priority,
        startAt: before.startAt,
        endAt: before.endAt,
      },
      {
        title: after?.title,
        priority: after?.priority,
        startAt: after?.startAt,
        endAt: after?.endAt,
      },
    ),
  });
}

/**
 * A one-field change from a list or a card.
 *
 * updateTask replaces the whole task, which is right for the task form and wrong for setting a
 * date from a row: anything the caller did not send would be wiped. patchTask touches only the
 * fields it is given, and recomputes planned hours whenever either date moves.
 */
export interface TaskPatch {
  priority?: Priority;
  description?: string | null;
  folderId?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  assigneeIds?: string[];
  title?: string;
  tags?: string[];
}

export async function patchTask(id: string, patch: TaskPatch): Promise<void> {
  await connectToDatabase();

  const before = await tasks().findById(id);
  if (!before) throw new Error('Task not found.');

  const set: Record<string, unknown> = { lastActivityAt: new Date() };

  if (patch.priority) set.priority = patch.priority;

  if (patch.description !== undefined) set.description = patch.description?.trim() || null;

  if (patch.tags !== undefined) set.tags = patch.tags;

  if (patch.folderId !== undefined) {
    // Moving into a private folder has to respect the same rule as assigning into one.
    await assertAssignable(
      patch.folderId,
      (patch.assigneeIds ?? before.assigneeIds.map(String)).filter(Boolean),
      String(before.spaceId),
    );

    set.folderId = toOptionalObjectId(patch.folderId);
  }

  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new Error('A task needs a title.');
    set.title = title;
  }

  if (patch.assigneeIds) {
    await assertAssignable(
      before.folderId ? String(before.folderId) : null,
      patch.assigneeIds.filter(Boolean),
      String(before.spaceId),
    );

    const assigneeIds = patch.assigneeIds.filter(Boolean).map((value) => toObjectId(value));
    set.assigneeIds = assigneeIds;
    set.primaryAssigneeId = assigneeIds[0] ?? null;
  }

  if (patch.startAt !== undefined || patch.endAt !== undefined) {
    const startAt = patch.startAt !== undefined ? toDate(patch.startAt) : (before.startAt ?? null);
    const endAt = patch.endAt !== undefined ? toDate(patch.endAt) : (before.endAt ?? null);

    if (startAt && endAt && endAt <= startAt) {
      throw new Error('The end must come after the start.');
    }

    set.startAt = startAt;
    set.endAt = endAt;
    set.plannedMinutes = await plannedMinutesFor(startAt, endAt);
  }

  await tasks().updateOne({ _id: before._id }, { $set: set });

  await recordAudit({
    action: 'task.updated',
    entityType: 'Task',
    entityId: before._id,
    ...changedFields(
      { priority: before.priority, startAt: before.startAt, endAt: before.endAt },
      { priority: set.priority, startAt: set.startAt, endAt: set.endAt },
    ),
  });
}

export async function addSubtask(taskId: string, title: string): Promise<void> {
  await connectToDatabase();

  const task = await tasks().updateOne(
    { _id: toObjectId(taskId) },
    {
      $push: { subtasks: { title: title.trim(), done: false } },
      $set: { lastActivityAt: new Date() },
    },
  );

  if (!task) throw new Error('Task not found.');
}

/** One level of breakdown only: a subtask that needs subtasks of its own is really a task. */
export async function toggleSubtask(
  taskId: string,
  subtaskId: string,
  done: boolean,
): Promise<void> {
  await connectToDatabase();

  const task = await tasks().findById(taskId);
  if (!task) throw new Error('Task not found.');

  const subtask = task.subtasks.find((candidate) => String(candidate._id) === subtaskId);
  if (!subtask) throw new Error('Subtask not found.');

  subtask.done = done;
  subtask.completedAt = done ? new Date() : null;
  task.lastActivityAt = new Date();

  await task.save();
}

/**
 * Give one subtask to one person, or clear it. A subtask is often the half of a task somebody else
 * does, so it carries its own owner. Passing null unassigns it.
 */
export async function setSubtaskAssignee(
  taskId: string,
  subtaskId: string,
  assigneeId: string | null,
): Promise<void> {
  await connectToDatabase();

  const task = await tasks().findById(taskId);
  if (!task) throw new Error('Task not found.');

  const subtask = task.subtasks.find((candidate) => String(candidate._id) === subtaskId);
  if (!subtask) throw new Error('Subtask not found.');

  if (assigneeId) {
    const allowed = await assignableUserIdsForSubtask(task);
    if (allowed && !allowed.includes(assigneeId)) {
      throw new Error(
        task.assigneeIds.length > 0
          ? 'A subtask can only go to someone already assigned to its task.'
          : 'That person is not a member of this private Space or Folder.',
      );
    }
  }

  subtask.assigneeId = assigneeId ? toObjectId(assigneeId) : null;
  task.lastActivityAt = new Date();

  await task.save();
}

export async function addDocumentLink(
  taskId: string,
  rawUrl: string,
  title?: string,
): Promise<void> {
  await connectToDatabase();

  const parsed = parseDocumentLink(rawUrl);

  const task = await tasks().updateOne(
    { _id: toObjectId(taskId) },
    {
      $push: {
        documentLinks: {
          url: parsed.url,
          title: title?.trim() || parsed.suggestedTitle,
          addedById: getContext().userId,
          addedAt: new Date(),
        },
      },
      $set: { lastActivityAt: new Date() },
    },
  );

  if (!task) throw new Error('Task not found.');

  await recordAudit({
    action: 'task.document_linked',
    entityType: 'Task',
    entityId: task._id,
    after: { url: parsed.url },
  });
}

export async function removeDocumentLink(taskId: string, linkId: string): Promise<void> {
  await connectToDatabase();

  await tasks().updateOne(
    { _id: toObjectId(taskId) },
    { $pull: { documentLinks: { _id: toObjectId(linkId) } }, $set: { lastActivityAt: new Date() } },
  );
}

/**
 * Moving a task on the board.
 *
 * Position is stored rather than inferred from dates, because a board people drag things around on
 * has an order that means something to them and nothing to a computer. New position is the midpoint
 * between its neighbours, so a move rewrites one row rather than renumbering the column.
 */
export async function moveTaskToPosition(
  id: string,
  status: string,
  afterTaskId: string | null,
  beforeTaskId: string | null,
): Promise<void> {
  await connectToDatabase();

  const task = await tasks().findById(id);
  if (!task) throw new Error('Task not found.');

  if (task.status !== status) {
    await moveTask(id, status);
  }

  const [after, before] = await Promise.all([
    afterTaskId ? tasks().findById(afterTaskId) : null,
    beforeTaskId ? tasks().findById(beforeTaskId) : null,
  ]);

  const afterOrder = after?.sortOrder ?? null;
  const beforeOrder = before?.sortOrder ?? null;

  let sortOrder: number;

  if (afterOrder !== null && beforeOrder !== null) {
    sortOrder = (afterOrder + beforeOrder) / 2;
  } else if (afterOrder !== null) {
    sortOrder = afterOrder + 1000;
  } else if (beforeOrder !== null) {
    sortOrder = beforeOrder - 1000;
  } else {
    sortOrder = Date.now();
  }

  await tasks().updateOne({ _id: task._id }, { $set: { sortOrder, lastActivityAt: new Date() } });
}

export async function archiveTask(id: string): Promise<void> {
  await connectToDatabase();

  const removed = await tasks().softDelete({ _id: toObjectId(id) });
  if (!removed) throw new Error('Task not found.');

  await recordAudit({
    action: 'task.archived',
    entityType: 'Task',
    entityId: removed._id,
    before: { number: removed.number, title: removed.title },
  });
}
