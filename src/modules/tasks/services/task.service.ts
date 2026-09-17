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

/**
 * Tasks.
 *
 * isClosed is denormalised from the project's column configuration whenever the status changes, so
 * the dashboard counts open work with one indexed query rather than joining to the project on
 * every tile. lastActivityAt is touched on every meaningful change, which is what the ageing view
 * reads.
 */

const tasks = () => repository(TaskModel);

export type Priority = 'urgent' | 'high' | 'normal' | 'low';

export interface TaskSummary {
  id: string;
  number: string;
  title: string;
  status: string;
  priority: Priority;
  projectId: string;
  projectName: string;
  portfolioId: string;
  assigneeNames: string[];
  dueDate: Date | null;
  estimateMinutes: number | null;
  stepCount: number;
  stepsDone: number;
  documentCount: number;
  isClosed: boolean;
  isOverdue: boolean;
  lastActivityAt: Date;
}

export interface TaskFilter {
  projectId?: string;
  portfolioId?: string;
  assigneeId?: string;
  status?: string;
  includeClosed?: boolean;
  overdueOnly?: boolean;
  unassignedOnly?: boolean;
}

function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export async function listTasks(filter: TaskFilter = {}): Promise<TaskSummary[]> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};

  if (filter.projectId) query.projectId = toObjectId(filter.projectId);
  if (filter.portfolioId) query.portfolioId = toObjectId(filter.portfolioId);
  if (filter.assigneeId) query.assigneeIds = toObjectId(filter.assigneeId);
  if (filter.status) query.status = filter.status;
  if (!filter.includeClosed) query.isClosed = false;
  if (filter.overdueOnly) query.dueDate = { $lt: startOfToday() };
  if (filter.unassignedOnly) query.assigneeIds = { $size: 0 };

  const found = await tasks().find(query).sort({ dueDate: 1, createdAt: -1 });

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

  const today = startOfToday();

  return found.map((task) => ({
    id: String(task._id),
    number: task.number,
    title: task.title,
    status: task.status,
    priority: task.priority as Priority,
    projectId: String(task.projectId),
    projectName: projectNames.get(String(task.projectId)) ?? 'Unknown',
    portfolioId: String(task.portfolioId),
    assigneeNames: task.assigneeIds.map((id) => names.get(String(id)) ?? 'Unknown'),
    dueDate: task.dueDate ?? null,
    estimateMinutes: task.estimateMinutes ?? null,
    stepCount: task.steps.length,
    stepsDone: task.steps.filter((step) => step.done).length,
    documentCount: task.documentLinks.length,
    isClosed: task.isClosed ?? false,
    isOverdue: !task.isClosed && !!task.dueDate && task.dueDate < today,
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
  dueDate?: string | null;
  estimateMinutes?: number | null;
  organisationId?: string | null;
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

  const created = await tasks().create({
    number: await nextNumber('task'),
    title: input.title.trim(),
    description: input.description?.trim() || null,
    portfolioId: project.portfolioId,
    projectId: project._id,
    status: firstColumn?.name ?? 'To do',
    priority: input.priority ?? 'normal',
    assigneeIds,
    primaryAssigneeId: assigneeIds[0] ?? null,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    estimateMinutes: input.estimateMinutes ?? null,
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
  dueDate?: string | null;
  startDate?: string | null;
  estimateMinutes?: number | null;
  tags?: string[];
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<void> {
  await connectToDatabase();

  const before = await tasks().findById(id);
  if (!before) throw new Error('Task not found.');

  const assigneeIds = input.assigneeIds.filter(Boolean).map((value) => toObjectId(value));

  const after = await tasks().updateOne(
    { _id: before._id },
    {
      $set: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        priority: input.priority,
        assigneeIds,
        primaryAssigneeId: assigneeIds[0] ?? null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        estimateMinutes: input.estimateMinutes ?? null,
        tags: input.tags ?? [],
        lastActivityAt: new Date(),
      },
    },
  );

  await recordAudit({
    action: 'task.updated',
    entityType: 'Task',
    entityId: before._id,
    ...changedFields(
      { title: before.title, priority: before.priority, dueDate: before.dueDate },
      { title: after?.title, priority: after?.priority, dueDate: after?.dueDate },
    ),
  });
}

export async function addStep(taskId: string, title: string): Promise<void> {
  await connectToDatabase();

  const task = await tasks().updateOne(
    { _id: toObjectId(taskId) },
    {
      $push: { steps: { title: title.trim(), done: false } },
      $set: { lastActivityAt: new Date() },
    },
  );

  if (!task) throw new Error('Task not found.');
}

export async function toggleStep(taskId: string, stepId: string, done: boolean): Promise<void> {
  await connectToDatabase();

  const task = await tasks().findById(taskId);
  if (!task) throw new Error('Task not found.');

  const step = task.steps.find((candidate) => String(candidate._id) === stepId);
  if (!step) throw new Error('Step not found.');

  step.done = done;
  step.completedAt = done ? new Date() : null;
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
