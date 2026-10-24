import { Schema, model, models } from 'mongoose';
import { UserModel } from '@coex/shared/core/models/user.model';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { permissionsFor, type Role } from '@coex/shared/core/permissions';
import { connectToDatabase } from '@/lib/db';
import { runWithContext } from '@/lib/tenant-context';
import {
  listTasks,
  getTask,
  listTaskComments,
  addTaskComment,
  setMySubtaskDone,
  createTask,
} from '@/modules/tasks/services/task.service';
import { loadTeamsForm, teamsConfig } from './teams.service';
import { signDraft, taskFieldsSchema } from './teams-protocol';
import { formChoices } from './form-model';
import { verifyTeamsTabToken } from './tab-auth';
import { z } from 'zod';

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
  work: z.enum(['active', 'done', 'all']).default('active'),
});
const writeSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('comment'), taskId: id, body: z.string().trim().min(1).max(4000) }),
  z.object({ action: z.literal('personalDone'), taskId: id, done: z.boolean() }),
  z.object({
    action: z.literal('create'),
    requestId: z.uuid(),
    fields: z.record(z.string(), z.unknown()),
  }),
]);

export async function withTeamsTabActor<T>(
  token: string,
  work: (actorId: string, settings: NonNullable<ReturnType<typeof teamsConfig>>) => Promise<T>,
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
    () => work(String(actor._id), settings),
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
  return withTeamsTabActor(token, async (actorId, settings) => {
    const input = parsed.data;
    if (input.action === 'form') return choices(actorId, settings);
    if (input.action === 'list')
      return {
        tasks: await listTasks({ assigneeId: actorId, personalWork: input.work }),
        appUrl: settings.url,
      };
    if (!input.taskId) throw new TeamsTabError(400, 'Choose a task.');
    const task = await getTask(input.taskId);
    if (!task) throw new TeamsTabError(404, 'This task is unavailable or your access changed.');
    const comments = await listTaskComments(input.taskId);
    return {
      task: {
        id: String(task._id),
        number: task.number,
        title: task.title,
        description: task.description,
        status: task.status,
      },
      comments: comments.reverse(),
      appUrl: settings.url,
    };
  });
}

export async function writeTeamsTab(token: string, raw: unknown) {
  const parsed = writeSchema.safeParse(raw);
  if (!parsed.success) throw new TeamsTabError(400, 'Check the form and try again.');
  return withTeamsTabActor(token, async (actorId, settings) => {
    const input = parsed.data;
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
    const assignee = values.assignee ?? actorId;
    if (assignee && !formChoices(data, spaceId, folderId).people.some((p) => p.id === assignee))
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
      assigneeIds: assignee ? [assignee] : [],
      priority: values.priority,
      endAt: values.dueDate ? `${values.dueDate}T${values.dueTime || '00:00'}` : null,
    });
    await Receipts.updateOne({ _id: receiptId }, { $set: { taskId } });
    return { taskId };
  });
}
