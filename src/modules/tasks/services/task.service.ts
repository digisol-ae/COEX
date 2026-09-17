import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { repository } from '@/lib/repository';
import { toObjectId, toOptionalObjectId } from '@/lib/ids';
import { recordAudit, changedFields } from '@/modules/core/services/audit.service';
import { nextNumber } from '@/modules/core/services/numbering.service';
import { recordActivity } from '@/modules/crm/services/activity.service';
import { UserModel } from '@/modules/core/models/user.model';
import { TaskModel } from '../models/task.model';
import { ProjectModel } from '../models/project.model';
import { parseDocumentLink } from '../document-links';
import { TenantModel } from '@/modules/core/models/tenant.model';
import {
  DEFAULT_CALENDAR,
  workingMinutesBetween,
  type WorkingCalendar,
} from '@/modules/tickets/business-hours';

/**
 * Tasks.
 *
 * isClosed is denormalised from the project's column configuration whenever the status changes, so
 * the dashboard counts open work with one indexed query rather than joining to the project on
 * every tile. lastActivityAt is touched on every meaningful change, which is what the ageing view
 * reads.
 */

const tasks = () => repository(TaskModel);

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
  projectId: string;
  projectName: string;
  phase: string | null;
  assigneeIds: string[];
  assigneeNames: string[];
  startAt: Date | null;
  endAt: Date | null;
  plannedMinutes: number | null;
  estimateMinutes: number | null;
  sortOrder: number;
  subtaskCount: number;
  subtasksDone: number;
  subtasks: { id: string; title: string; done: boolean }[];
  documentCount: number;
  isClosed: boolean;
  isOverdue: boolean;
  lastActivityAt: Date;
}

export interface TaskFilter {
  projectId?: string;
  phase?: string;
  assigneeId?: string;
  status?: string;
  includeClosed?: boolean;
  overdueOnly?: boolean;
  unassignedOnly?: boolean;
}

export async function listTasks(filter: TaskFilter = {}): Promise<TaskSummary[]> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};

  if (filter.projectId) query.projectId = toObjectId(filter.projectId);
  if (filter.phase) query.phase = filter.phase;
  if (filter.assigneeId) query.assigneeIds = toObjectId(filter.assigneeId);
  if (filter.status) query.status = filter.status;
  if (!filter.includeClosed) query.isClosed = false;
  if (filter.overdueOnly) query.endAt = { $lt: new Date() };
  if (filter.unassignedOnly) query.assigneeIds = { $size: 0 };

  const found = await tasks().find(query).sort({ sortOrder: 1, endAt: 1, createdAt: -1 });

  const projectNames = new Map(
    (await ProjectModel.find({ tenantId: getContext().tenantId, deletedAt: null })).map(
      (project) => [String(project._id), project.name],
    ),
  );

  const assigneeIds = [
    ...new Set(found.flatMap((task) => task.assigneeIds.map((id) => String(id)))),
  ];
  const users = await UserModel.find({ _id: { $in: assigneeIds } }).select('name');
  const names = new Map(users.map((user) => [String(user._id), user.name]));

  const now = new Date();

  return found.map((task) => ({
    id: String(task._id),
    number: task.number,
    title: task.title,
    status: task.status,
    priority: task.priority as Priority,
    projectId: String(task.projectId),
    projectName: projectNames.get(String(task.projectId)) ?? 'Unknown',
    phase: task.phase ?? null,
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
    })),
    documentCount: task.documentLinks.length,
    isClosed: task.isClosed ?? false,
    isOverdue: !task.isClosed && !!task.endAt && task.endAt < now,
    lastActivityAt: task.lastActivityAt ?? task.updatedAt,
  }));
}

export async function getTask(id: string) {
  await connectToDatabase();
  return tasks().findById(id);
}

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  priority?: Priority;
  assigneeIds?: string[];
  startAt?: string | null;
  endAt?: string | null;
  estimateMinutes?: number | null;
  organisationId?: string | null;
  phase?: string | null;
}

export async function createTask(input: CreateTaskInput): Promise<string> {
  await connectToDatabase();

  const project = await ProjectModel.findOne({
    _id: toObjectId(input.projectId),
    tenantId: getContext().tenantId,
    deletedAt: null,
  });

  if (!project) throw new Error('Project not found.');

  const firstColumn = [...project.statuses].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  )[0];

  const assigneeIds = (input.assigneeIds ?? []).filter(Boolean).map((id) => toObjectId(id));

  const startAt = toDate(input.startAt);
  const endAt = toDate(input.endAt);

  const created = await tasks().create({
    number: await nextNumber('task'),
    title: input.title.trim(),
    description: input.description?.trim() || null,
    projectId: project._id,
    phase: input.phase?.trim() || null,
    status: firstColumn?.name ?? 'To do',
    priority: input.priority ?? 'normal',
    assigneeIds,
    primaryAssigneeId: assigneeIds[0] ?? null,
    startAt,
    endAt,
    plannedMinutes: await plannedMinutesFor(startAt, endAt),
    estimateMinutes: input.estimateMinutes ?? null,
    sortOrder: Date.now(),
    organisationId: toOptionalObjectId(input.organisationId ?? project.organisationId),
    isClosed: firstColumn?.isClosed ?? false,
    lastActivityAt: new Date(),
    createdById: getContext().userId,
  });

  await recordAudit({
    action: 'task.created',
    entityType: 'Task',
    entityId: created._id,
    after: { number: created.number, title: created.title, project: project.name },
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

  const project = await ProjectModel.findOne({
    _id: task.projectId,
    tenantId: getContext().tenantId,
  });

  const column = project?.statuses.find((candidate) => candidate.name === status);
  if (!column) throw new Error('That column does not exist on this project.');

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
  phase?: string | null;
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<void> {
  await connectToDatabase();

  const before = await tasks().findById(id);
  if (!before) throw new Error('Task not found.');

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
        phase: input.phase?.trim() || null,
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
  startAt?: string | null;
  endAt?: string | null;
  assigneeIds?: string[];
  title?: string;
}

export async function patchTask(id: string, patch: TaskPatch): Promise<void> {
  await connectToDatabase();

  const before = await tasks().findById(id);
  if (!before) throw new Error('Task not found.');

  const set: Record<string, unknown> = { lastActivityAt: new Date() };

  if (patch.priority) set.priority = patch.priority;

  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (!title) throw new Error('A task needs a title.');
    set.title = title;
  }

  if (patch.assigneeIds) {
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
