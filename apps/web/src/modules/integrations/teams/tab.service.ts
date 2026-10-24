import { Schema, model, models } from 'mongoose';
import { UserModel } from '@coex/shared/core/models/user.model';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { permissionsFor, type Permission, type Role } from '@coex/shared/core/permissions';
import { connectToDatabase } from '@/lib/db';
import { runWithContext } from '@/lib/tenant-context';
import {
  listTasks,
  getTask,
  listTaskComments,
  addTaskComment,
  setMySubtaskDone,
  createTask,
  patchTask,
  assignableUserIdsForTask,
} from '@/modules/tasks/services/task.service';
import { loadTeamsForm, teamsConfig } from './teams.service';
import { signDraft, taskFieldsSchema } from './teams-protocol';
import { formChoices } from './form-model';
import { verifyTeamsTabToken } from './tab-auth';
import { z } from 'zod';
import { taskTeamsSource } from '@coex/shared/tasks/teams-sharing';
import { toDateKey } from '@coex/shared/time/week';
import { TimeEntryModel } from '@coex/shared/time/models/time-entry.model';
import { getContext } from '@/lib/tenant-context';
import {
  getRunningTimer,
  startTimer,
  stopTimer,
  addManualEntry,
  updateEntry,
} from '@/modules/time/services/time.service';

export class TeamsTabError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const Receipts =
  models.TeamsTabReceipt ??
  model(
    'TeamsTabReceipt',
    new Schema({
      _id: String,
      taskId: { type: String, default: null },
      createdAt: { type: Date, default: Date.now },
    }),
  );
const id = z.string().regex(/^[a-f\d]{24}$/i);
const readSchema = z.object({
  action: z.enum(['list', 'detail', 'form']),
  taskId: id.optional(),
  agents: z.string().max(1300).optional(),
  work: z.enum(['active', 'done', 'all']).default('active'),
});
const assignees = z
  .array(id)
  .max(50)
  .transform((ids) => [...new Set(ids)]);
const day = z.iso.date();
const duration = z.number().int().min(1).max(1440);
const writeSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('assign'), taskId: id, assigneeIds: assignees }),
  z.object({ action: z.literal('timerStart'), taskId: id }),
  z.object({ action: z.literal('timerStop') }),
  z.object({
    action: z.literal('timeAdd'),
    taskId: id,
    workDate: day,
    duration,
    note: z.string().max(2000).optional(),
    billable: z.boolean().default(false),
  }),
  z.object({
    action: z.literal('timeEdit'),
    taskId: id,
    entryId: id,
    workDate: day,
    duration,
    note: z.string().max(2000).optional(),
    billable: z.boolean().default(false),
    reason: z.string().trim().min(1).max(500),
  }),
  z.object({ action: z.literal('comment'), taskId: id, body: z.string().trim().min(1).max(4000) }),
  z.object({ action: z.literal('personalDone'), taskId: id, done: z.boolean() }),
  z.object({
    action: z.literal('create'),
    requestId: z.uuid(),
    fields: z.record(z.string(), z.unknown()),
    assigneeIds: assignees.optional(),
  }),
]);

export async function withTeamsTabActor<T>(
  token: string,
  work: (
    actorId: string,
    settings: NonNullable<ReturnType<typeof teamsConfig>>,
    permissions: Set<Permission>,
  ) => Promise<T>,
) {
  const settings = teamsConfig();
  if (!settings) throw new TeamsTabError(503, 'Teams access is not configured.');
  let oid: string;
  try {
    oid = await verifyTeamsTabToken(token, settings);
  } catch {
    throw new TeamsTabError(
      401,
      'Your Teams sign-in could not be verified. Reopen Worktello in Teams.',
    );
  }
  await connectToDatabase();
  const [actors, tenant] = await Promise.all([
    UserModel.find({
      tenantId: settings.tenantId,
      entraObjectId: oid,
      status: 'active',
      deletedAt: null,
    }).limit(2),
    TenantModel.findOne({ _id: settings.tenantId, status: 'active' }),
  ]);
  const actor = actors.length === 1 ? actors[0] : null;
  if (
    !actor ||
    !tenant?.modules?.tasks ||
    actor.role === 'client_contact' ||
    !permissionsFor({
      role: actor.role as Role,
      permissionGrants: actor.permissionGrants,
      permissionDenials: actor.permissionDenials,
    }).has('task.manage')
  )
    throw new TeamsTabError(
      403,
      'Sign in to Worktello with Microsoft to link your staff account, or ask your administrator to check task access.',
    );
  return runWithContext(
    {
      tenantId: actor.tenantId,
      userId: actor._id,
      isPlatformAdmin: actor.role === 'platform_admin',
    },
    () =>
      work(
        String(actor._id),
        settings,
        permissionsFor({
          role: actor.role as Role,
          permissionGrants: actor.permissionGrants,
          permissionDenials: actor.permissionDenials,
        }),
      ),
  );
}

async function choices(actorId: string, settings: NonNullable<ReturnType<typeof teamsConfig>>) {
  const draft = await signDraft(
    {
      sub: actorId,
      tenant: settings.tenantId,
      text: '',
      url: settings.url + '/integrations/teams/app',
    },
    settings.secret,
  );
  return loadTeamsForm(draft, settings);
}

export async function readTeamsTab(token: string, raw: unknown) {
  const parsed = readSchema.safeParse(raw);
  if (!parsed.success) throw new TeamsTabError(400, 'Choose a valid task or filter.');
  return withTeamsTabActor(token, async (actorId, settings, permissions) => {
    const input = parsed.data;
    if (input.action === 'form')
      return {
        ...(await choices(actorId, settings)),
        canAssignOthers: permissions.has('teams.tasks.assign.others'),
        canViewOthers: permissions.has('teams.tasks.read.others'),
      };
    if (input.action === 'list') {
      const selected = input.agents ? assignees.safeParse(input.agents.split(',')) : null;
      if (selected && !selected.success) throw new TeamsTabError(400, 'Choose valid agents.');
      const agentIds = selected?.success ? selected.data : [actorId];
      if (
        agentIds.some((agent) => agent !== actorId) &&
        !permissions.has('teams.tasks.read.others')
      )
        throw new TeamsTabError(403, 'You are not allowed to view other agents’ tasks in Teams.');
      const own = agentIds.length === 1 && agentIds[0] === actorId;
      const people = permissions.has('teams.tasks.read.others')
        ? await UserModel.find({
            tenantId: settings.tenantId,
            status: 'active',
            deletedAt: null,
            role: { $ne: 'client_contact' },
          })
            .sort({ name: 1 })
            .select('_id name')
        : [];
      return {
        tasks: await listTasks(
          own
            ? { assigneeId: actorId, personalWork: input.work }
            : { assigneeIds: agentIds, personalWork: 'all' },
        ),
        actorId,
        people: people.map((p) => ({ id: String(p._id), name: p.name })),
        canViewOthers: permissions.has('teams.tasks.read.others'),
        canAssignOthers: permissions.has('teams.tasks.assign.others'),
        runningTimer: await getRunningTimer(),
        appUrl: settings.url,
      };
    }
    if (!input.taskId) throw new TeamsTabError(400, 'Choose a task.');
    const task = await accessibleTask(input.taskId, actorId, permissions);
    const comments = await listTaskComments(input.taskId);
    return {
      task: {
        id: String(task._id),
        number: task.number,
        title: task.title,
        description: task.description,
        status: task.status,
        assigneeIds: task.assigneeIds.map(String),
        sourceTeamsMessageUrl: taskTeamsSource(task.sourceTeamsMessageUrl, task.description),
      },
      comments: comments.reverse(),
      canAssignOthers: permissions.has('teams.tasks.assign.others'),
      assignmentPeople: permissions.has('teams.tasks.assign.others')
        ? formChoices(
            await choices(actorId, settings),
            String(task.spaceId),
            task.folderId ? String(task.folderId) : '',
          ).people
        : [],
      runningTimer: await getRunningTimer(),
      timeEntries: (
        await TimeEntryModel.find({
          tenantId: getContext().tenantId,
          userId: getContext().userId,
          taskId: task._id,
          deletedAt: null,
          running: false,
        })
          .sort({ workDate: -1 })
          .limit(100)
      ).map((entry) => ({
        id: String(entry._id),
        workDate: toDateKey(entry.workDate),
        minutes: entry.minutes,
        note: entry.note ?? '',
        billable: entry.billable,
        locked: !!entry.lockedAt,
      })),
      appUrl: settings.url,
    };
  });
}

export async function writeTeamsTab(token: string, raw: unknown) {
  const parsed = writeSchema.safeParse(raw);
  if (!parsed.success) throw new TeamsTabError(400, 'Check the form and try again.');
  return withTeamsTabActor(token, async (actorId, settings, permissions) => {
    const input = parsed.data;
    if (input.action === 'timerStop') {
      await stopTimer();
      return { ok: true };
    }
    if ('taskId' in input) await accessibleTask(input.taskId, actorId, permissions);
    if (input.action === 'timerStart') {
      await timeMutation(() => startTimer(input.taskId));
      return { ok: true };
    }
    if (input.action === 'timeAdd') {
      await timeMutation(() => addManualEntry(input));
      return { ok: true };
    }
    if (input.action === 'timeEdit') {
      const entry = await TimeEntryModel.findOne({
        _id: input.entryId,
        tenantId: getContext().tenantId,
        userId: getContext().userId,
        taskId: input.taskId,
        deletedAt: null,
      });
      if (!entry) throw new TeamsTabError(404, 'Your time entry is unavailable.');
      await timeMutation(() => updateEntry(input.entryId, { ...input, mayEditOthers: false }));
      return { ok: true };
    }
    if (input.action === 'assign') {
      if (!permissions.has('teams.tasks.assign.others'))
        throw new TeamsTabError(403, 'You are not allowed to assign agents in Teams.');
      const task = await accessibleTask(input.taskId, actorId, permissions);
      await validateAssignees(input.assigneeIds, settings, task);
      await patchTask(input.taskId, { assigneeIds: input.assigneeIds });
      return { ok: true };
    }
    if (input.action === 'comment') {
      await addTaskComment(input.taskId, input.body);
      return { ok: true };
    }
    if (input.action === 'personalDone') {
      try {
        await setMySubtaskDone(input.taskId, input.done);
      } catch (cause) {
        if (
          cause instanceof Error &&
          [
            'Complete your assigned subtasks first.',
            'Only an assignee can change their own subtask completion.',
          ].includes(cause.message)
        )
          throw new TeamsTabError(400, cause.message);
        throw cause;
      }
      return { ok: true };
    }
    const fields = taskFieldsSchema.safeParse({ ...input.fields, draft: 'personal-tab' });
    if (!fields.success)
      throw new TeamsTabError(400, 'Check the title, destination, assignee and due date.');
    const values = fields.data;
    const data = await choices(actorId, settings);
    const [spaceId, folderId = ''] = values.destination.split(':');
    if (
      !data.spaces.some((s) => s.id === spaceId) ||
      (folderId && !data.folders.some((f) => f.id === folderId && f.spaceId === spaceId))
    )
      throw new TeamsTabError(403, 'That space or folder is no longer available.');
    const selectedAssignees =
      input.assigneeIds ?? (values.assignee === '' ? [] : [values.assignee ?? actorId]);
    if (
      (!selectedAssignees.length || selectedAssignees.some((id) => id !== actorId)) &&
      !permissions.has('teams.tasks.assign.others')
    )
      throw new TeamsTabError(403, 'You may only assign tasks to yourself in Teams.');
    if (
      selectedAssignees.some(
        (assignee) => !formChoices(data, spaceId, folderId).people.some((p) => p.id === assignee),
      )
    )
      throw new TeamsTabError(403, 'Choose an assignee who can access this destination.');
    const receiptId = `${settings.tenantId}:${actorId}:${input.requestId}`;
    try {
      await Receipts.create({ _id: receiptId });
    } catch (cause) {
      if ((cause as { code?: number }).code !== 11000) throw cause;
      const receipt = await Receipts.findById(receiptId);
      if (receipt?.taskId) return { taskId: receipt.taskId as string };
      throw new TeamsTabError(
        409,
        'This request may still be processing. Check your task list before creating another task.',
      );
    }
    const taskId = await createTask({
      spaceId,
      folderId: folderId || null,
      title: values.title,
      description: values.description,
      assigneeIds: selectedAssignees,
      priority: values.priority,
      endAt: values.dueDate ? `${values.dueDate}T${values.dueTime || '00:00'}` : null,
    });
    await Receipts.updateOne({ _id: receiptId }, { $set: { taskId } });
    return { taskId };
  });
}

async function accessibleTask(taskId: string, actorId: string, permissions: Set<Permission>) {
  const task = await getTask(taskId);
  if (
    !task ||
    (!permissions.has('teams.tasks.read.others') &&
      !task.assigneeIds.some((id) => String(id) === actorId))
  )
    throw new TeamsTabError(404, 'This task is unavailable or your access changed.');
  return task;
}
async function validateAssignees(
  ids: string[],
  settings: NonNullable<ReturnType<typeof teamsConfig>>,
  task: { spaceId: unknown; folderId?: unknown },
) {
  const people = await UserModel.find({
    tenantId: settings.tenantId,
    _id: { $in: ids },
    status: 'active',
    deletedAt: null,
    role: { $ne: 'client_contact' },
  }).select('_id');
  const allowed = await assignableUserIdsForTask({
    spaceId: String(task.spaceId),
    folderId: task.folderId ? String(task.folderId) : null,
  });
  if (people.length !== ids.length || (allowed && ids.some((id) => !allowed.includes(id))))
    throw new TeamsTabError(403, 'Choose active agents who can access this destination.');
}

async function timeMutation(work: () => Promise<void>) {
  try {
    await work();
  } catch (cause) {
    if (
      cause instanceof Error &&
      /week.*locked|locked.*week|Stop the timer before editing|Say why you are changing|Enter how long/i.test(
        cause.message,
      )
    )
      throw new TeamsTabError(400, cause.message);
    throw cause;
  }
}
