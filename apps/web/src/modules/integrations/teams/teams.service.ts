import { decodeJwt } from 'jose';
import { Schema, model, models } from 'mongoose';
import { UserModel } from '@coex/shared/core/models/user.model';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { SpaceModel } from '@coex/shared/tasks/models/space.model';
import { FolderModel } from '@coex/shared/tasks/models/folder.model';
import { permissionsFor, type Role } from '@coex/shared/core/permissions';
import { connectToDatabase } from '@/lib/db';
import { runWithContext } from '@/lib/tenant-context';
import { visibleSpaceFilter, canOpenSpace } from '@/modules/tasks/services/space.service';
import { visibleFolderIds, canOpenFolder } from '@/modules/tasks/services/folder.service';
import { assignableUserIdsForTask, createTask } from '@/modules/tasks/services/task.service';
import {
  readDraft,
  signDraft,
  sourceMessage,
  taskFieldsSchema,
  messageResponse,
  type TeamsActivity,
} from './teams-protocol';

// _id is MongoDB's built-in unique key: a submission is reserved BEFORE creating a task.
// Never expire uncertain receipts: a network retry must never create a second task.
const receiptSchema = new Schema({
  _id: String,
  tenantId: { type: Schema.Types.ObjectId, required: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  taskId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});
const Receipts = models.TeamsTaskReceipt ?? model('TeamsTaskReceipt', receiptSchema);

export function teamsConfig() {
  const appId = process.env.COEX_TEAMS_APP_ID;
  const microsoftTenant = process.env.COEX_TEAMS_TENANT_ID;
  const tenantId = process.env.COEX_TEAMS_COEX_TENANT_ID;
  const secret = process.env.COEX_TEAMS_DRAFT_SECRET;
  const url = process.env.COEX_APP_URL ?? process.env.AUTH_URL;
  if (!appId || !microsoftTenant || !tenantId || !secret || secret.length < 32 || !url) return null;
  if (!/^[a-f\d]{24}$/i.test(tenantId)) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
    return {
      appId,
      microsoftTenant,
      tenantId,
      secret: new TextEncoder().encode(secret),
      url: parsed.origin,
    };
  } catch {
    return null;
  }
}

export async function handleTeamsActivity(
  activity: TeamsActivity,
  settings: NonNullable<ReturnType<typeof teamsConfig>>,
) {
  if (activity.channelData.tenant.id !== settings.microsoftTenant)
    return messageResponse('This Microsoft organisation is not connected to Worktello.');
  await connectToDatabase();
  const [users, tenant] = await Promise.all([
    UserModel.find({
      tenantId: settings.tenantId,
      entraObjectId: activity.from.aadObjectId,
      status: 'active',
      deletedAt: null,
    }).limit(2),
    TenantModel.findOne({ _id: settings.tenantId, status: 'active' }),
  ]);
  const actor = users.length === 1 ? users[0] : null;
  if (!actor || !tenant || actor.role === 'client_contact')
    return messageResponse(
      'Sign in to Worktello with Microsoft first to link your staff account. If it is already linked, ask your administrator to check access.',
    );
  if (
    !tenant.modules?.tasks ||
    !permissionsFor({
      role: actor.role as Role,
      permissionGrants: actor.permissionGrants,
      permissionDenials: actor.permissionDenials,
    }).has('task.manage')
  )
    return messageResponse('Your Worktello account does not have permission to create tasks.');

  return runWithContext(
    {
      tenantId: actor.tenantId,
      userId: actor._id,
      isPlatformAdmin: actor.role === 'platform_admin',
    },
    async () => {
      if (activity.name === 'composeExtension/fetchTask') {
        const source = sourceMessage(activity);
        const draft = await signDraft(
          { sub: String(actor._id), tenant: settings.tenantId, ...source },
          settings.secret,
        );
        return {
          task: {
            type: 'continue',
            value: {
              title: 'Create Worktello task',
              width: 'large',
              height: 'large',
              url: `${settings.url}/integrations/teams/create#draft=${encodeURIComponent(draft)}`,
            },
          },
        };
      }

      const parsed = taskFieldsSchema.safeParse(activity.value.data);
      if (!parsed.success)
        return messageResponse('Check the title, destination and due date, then try again.');
      const input = parsed.data;
      let draft;
      try {
        draft = await readDraft(input.draft, String(actor._id), settings.tenantId, settings.secret);
      } catch {
        return messageResponse(
          'This form has expired or could not be verified. Open Create Worktello task from the message again.',
        );
      }
      const previous = await Receipts.findById(draft.jti);
      if (previous) return receiptResponse(previous.taskId, settings.url);
      const [spaceId, folderId] = input.destination.split(':');
      const space = await SpaceModel.findOne({
        _id: spaceId,
        tenantId: actor.tenantId,
        deletedAt: null,
        status: 'active',
        isPersonal: { $ne: true },
      });
      if (!space || !(await canOpenSpace(spaceId)))
        return messageResponse('That space is no longer available to you. Open a new task form.');
      if (folderId) {
        const folder = await FolderModel.findOne({
          _id: folderId,
          spaceId,
          tenantId: actor.tenantId,
          status: 'active',
          deletedAt: null,
        });
        if (!folder || !(await canOpenFolder(folderId)))
          return messageResponse(
            'That folder is no longer available to you. Open a new task form.',
          );
      }
      const assigneeId = input.assignee ?? String(actor._id);
      if (
        assigneeId !== String(actor._id) &&
        !permissionsFor({
          role: actor.role as Role,
          permissionGrants: actor.permissionGrants,
          permissionDenials: actor.permissionDenials,
        }).has('teams.tasks.assign.others')
      )
        return messageResponse(
          'You may only assign tasks to yourself in Teams. Ask an administrator for Teams assignment permission.',
        );
      if (assigneeId) {
        const person = await UserModel.findOne({
          _id: assigneeId,
          tenantId: actor.tenantId,
          status: 'active',
          deletedAt: null,
          role: { $ne: 'client_contact' },
        });
        const allowed = await assignableUserIdsForTask({ spaceId, folderId });
        if (!person || (allowed && !allowed.includes(assigneeId)))
          return messageResponse(
            'That person cannot be assigned in this space/folder. Choose another assignee in a new form.',
          );
      }
      try {
        await Receipts.create({ _id: draft.jti, tenantId: actor.tenantId, userId: actor._id });
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
        const existing = await Receipts.findById(draft.jti);
        return receiptResponse(existing?.taskId, settings.url);
      }
      // If downstream work fails after insertion, leave the receipt pending. Check the task list
      // before starting a NEW form; automatically retrying could duplicate a saved task.
      const taskId = await createTask({
        spaceId,
        folderId: folderId ?? null,
        title: input.title,
        sourceTeamsMessageUrl: draft.url,
        description: `${input.description || draft.text}\n\nOriginal Teams message: ${draft.url}`,
        assigneeIds: assigneeId ? [assigneeId] : [],
        priority: input.priority,
        endAt: input.dueDate ? `${input.dueDate}T${input.dueTime || '00:00'}` : null,
      });
      await Receipts.updateOne({ _id: draft.jti }, { $set: { taskId } });
      return receiptResponse(taskId, settings.url);
    },
  );
}

function receiptResponse(taskId: string | null | undefined, url: string) {
  if (!taskId)
    return messageResponse(
      'This request is being processed or needs checking. Check Worktello tasks before opening a new form; resubmitting this form will not create another task.',
    );
  return {
    task: {
      type: 'continue',
      value: {
        title: 'Worktello task created',
        height: 'small',
        width: 'medium',
        card: {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            version: '1.4',
            body: [{ type: 'TextBlock', text: 'Task created in Worktello.', wrap: true }],
            actions: [
              { type: 'Action.OpenUrl', title: 'Open in Worktello', url: `${url}/tasks/${taskId}` },
            ],
          },
        },
      },
    },
  };
}

/** A short-lived signed draft grants only read access to the form's permitted choices.
 * It arrives in the URL fragment (not proxy logs/referrers) and is POSTed to this loader.
 * Creation still goes through a Microsoft-signed submitAction; this loader cannot write tasks. */
export async function loadTeamsForm(
  token: string,
  settings: NonNullable<ReturnType<typeof teamsConfig>>,
) {
  const subject = decodeJwt(token).sub;
  if (!subject || !/^[a-f\d]{24}$/i.test(subject)) throw new Error('Invalid draft');
  const draft = await readDraft(token, subject, settings.tenantId, settings.secret);
  await connectToDatabase();
  const [actor, tenant] = await Promise.all([
    UserModel.findOne({
      _id: subject,
      tenantId: settings.tenantId,
      status: 'active',
      deletedAt: null,
      entraObjectId: { $type: 'string' },
      role: { $ne: 'client_contact' },
    }),
    TenantModel.findOne({ _id: settings.tenantId, status: 'active' }),
  ]);
  if (
    !actor ||
    !tenant?.modules?.tasks ||
    !permissionsFor({
      role: actor.role as Role,
      permissionGrants: actor.permissionGrants,
      permissionDenials: actor.permissionDenials,
    }).has('task.manage')
  )
    throw new Error('Access denied');
  return runWithContext(
    {
      tenantId: actor.tenantId,
      userId: actor._id,
      isPlatformAdmin: actor.role === 'platform_admin',
    },
    async () => {
      const spaces = await SpaceModel.find({
        tenantId: actor.tenantId,
        deletedAt: null,
        status: 'active',
        isPersonal: { $ne: true },
        ...(await visibleSpaceFilter()),
      })
        .sort({ name: 1 })
        .select('_id name memberIds');
      const folderIds = await visibleFolderIds();
      const folders = await FolderModel.find({
        tenantId: actor.tenantId,
        deletedAt: null,
        status: 'active',
        spaceId: { $in: spaces.map((s) => s._id) },
        ...(folderIds === null ? {} : { _id: { $in: folderIds } }),
      })
        .sort({ name: 1 })
        .select('_id name spaceId memberIds');
      const people = await UserModel.find({
        tenantId: actor.tenantId,
        status: 'active',
        deletedAt: null,
        role: { $ne: 'client_contact' },
      })
        .sort({ name: 1 })
        .select('_id name');
      return {
        canAssignOthers: permissionsFor({
          role: actor.role as Role,
          permissionGrants: actor.permissionGrants,
          permissionDenials: actor.permissionDenials,
        }).has('teams.tasks.assign.others'),
        appId: settings.appId,
        actorId: String(actor._id),
        title: draft.text.split('\n')[0].slice(0, 250),
        description: draft.text,
        spaces: spaces.map((s) => ({
          id: String(s._id),
          name: s.name,
          memberIds: s.memberIds.map(String),
        })),
        folders: folders.map((f) => ({
          id: String(f._id),
          name: f.name,
          spaceId: String(f.spaceId),
          memberIds: f.memberIds.map(String),
        })),
        people: people.map((p) => ({ id: String(p._id), name: p.name })),
      };
    },
  );
}
