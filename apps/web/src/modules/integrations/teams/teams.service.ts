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
    return messageResponse('This Microsoft organisation is not connected to COEX.');
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
      'Sign in to COEX with Microsoft first to link your staff account. If it is already linked, ask your administrator to check access.',
    );
  if (
    !tenant.modules?.tasks ||
    !permissionsFor({
      role: actor.role as Role,
      permissionGrants: actor.permissionGrants,
      permissionDenials: actor.permissionDenials,
    }).has('task.manage')
  )
    return messageResponse('Your COEX account does not have permission to create tasks.');

  return runWithContext(
    {
      tenantId: actor.tenantId,
      userId: actor._id,
      isPlatformAdmin: actor.role === 'platform_admin',
    },
    async () => {
      if (activity.name === 'composeExtension/fetchTask') {
        const source = sourceMessage(activity);
        const spaces = await SpaceModel.find({
          tenantId: actor.tenantId,
          deletedAt: null,
          status: 'active',
          isPersonal: { $ne: true },
          ...(await visibleSpaceFilter()),
        })
          .sort({ name: 1 })
          .select('_id name');
        const folderIds = await visibleFolderIds();
        const folders = await FolderModel.find({
          tenantId: actor.tenantId,
          deletedAt: null,
          status: 'active',
          spaceId: { $in: spaces.map((s) => s._id) },
          ...(folderIds === null ? {} : { _id: { $in: folderIds } }),
        })
          .sort({ name: 1 })
          .select('_id name spaceId');
        if (!spaces.length)
          return messageResponse(
            'No active COEX space is available to your account. Ask your administrator for access.',
          );
        const draft = await signDraft(
          { sub: String(actor._id), tenant: settings.tenantId, ...source },
          settings.secret,
        );
        return taskCard(
          'Choose a destination',
          [
            {
              type: 'Input.ChoiceSet',
              id: 'destination',
              label: 'Space / folder',
              isRequired: true,
              errorMessage: 'Choose a destination.',
              style: 'compact',
              choices: spaces.flatMap((space) => [
                { title: space.name, value: String(space._id) },
                ...folders
                  .filter((f) => String(f.spaceId) === String(space._id))
                  .map((f) => ({
                    title: `${space.name} / ${f.name}`,
                    value: `${space._id}:${f._id}`,
                  })),
              ]),
            },
          ],
          { type: 'Action.Submit', title: 'Continue', data: { step: 'destination', draft } },
        );
      }

      const parsed = taskFieldsSchema.safeParse(
        activity.value.data?.step === 'destination'
          ? { ...activity.value.data, title: 'Draft' }
          : activity.value.data,
      );
      if (!parsed.success)
        return messageResponse('Check the title, destination and due date, then try again.');
      const input = parsed.data;
      let draft;
      try {
        draft = await readDraft(input.draft, String(actor._id), settings.tenantId, settings.secret);
      } catch {
        return messageResponse(
          'This form has expired or could not be verified. Open Create COEX task from the message again.',
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
      if (activity.value.data?.step === 'destination') {
        const allowed = await assignableUserIdsForTask({ spaceId, folderId });
        const people = await UserModel.find({
          tenantId: actor.tenantId,
          deletedAt: null,
          status: 'active',
          role: { $ne: 'client_contact' },
          ...(allowed === null ? {} : { _id: { $in: allowed } }),
        })
          .sort({ name: 1 })
          .select('_id name');
        return taskCard(
          'Create COEX task',
          [
            { type: 'TextBlock', text: `Space: ${space.name}`, weight: 'Bolder', wrap: true },
            {
              type: 'Input.Text',
              id: 'title',
              label: 'Title',
              value: draft.text.split('\n')[0].slice(0, 250),
              isRequired: true,
              errorMessage: 'Enter a title.',
              maxLength: 250,
            },
            {
              type: 'Input.Text',
              id: 'description',
              label: 'Description',
              value: draft.text,
              isMultiline: true,
              maxLength: 12000,
            },
            {
              type: 'Input.ChoiceSet',
              id: 'assignee',
              label: 'Assignee',
              style: 'compact',
              choices: [
                { title: 'Unassigned', value: '' },
                ...people.map((p) => ({ title: p.name, value: String(p._id) })),
              ],
            },
            {
              type: 'Input.ChoiceSet',
              id: 'priority',
              label: 'Priority',
              value: 'normal',
              choices: ['low', 'normal', 'high', 'urgent'].map((value) => ({
                title: value[0].toUpperCase() + value.slice(1),
                value,
              })),
            },
            { type: 'Input.Date', id: 'dueDate', label: 'Due date (optional)' },
            {
              type: 'TextBlock',
              text: 'The original message link will be saved. Files and chat history are not copied.',
              wrap: true,
              isSubtle: true,
            },
          ],
          {
            type: 'Action.Submit',
            title: 'Create task',
            data: { draft: input.draft, destination: input.destination },
          },
        );
      }
      if (input.assignee) {
        const person = await UserModel.findOne({
          _id: input.assignee,
          tenantId: actor.tenantId,
          status: 'active',
          deletedAt: null,
          role: { $ne: 'client_contact' },
        });
        const allowed = await assignableUserIdsForTask({ spaceId, folderId });
        if (!person || (allowed && !allowed.includes(input.assignee)))
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
        description: `${input.description || draft.text}\n\nOriginal Teams message: ${draft.url}`,
        assigneeIds: input.assignee ? [input.assignee] : [],
        priority: input.priority,
        endAt: input.dueDate || null,
      });
      await Receipts.updateOne({ _id: draft.jti }, { $set: { taskId } });
      return receiptResponse(taskId, settings.url);
    },
  );
}

function receiptResponse(taskId: string | null | undefined, url: string) {
  if (!taskId)
    return messageResponse(
      'This request is being processed or needs checking. Check COEX tasks before opening a new form; resubmitting this form will not create another task.',
    );
  return {
    task: {
      type: 'continue',
      value: {
        title: 'COEX task created',
        height: 'small',
        width: 'medium',
        card: {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            version: '1.4',
            body: [{ type: 'TextBlock', text: 'Task created in COEX.', wrap: true }],
            actions: [
              { type: 'Action.OpenUrl', title: 'Open in COEX', url: `${url}/tasks/${taskId}` },
            ],
          },
        },
      },
    },
  };
}

function taskCard(title: string, body: Record<string, unknown>[], action: Record<string, unknown>) {
  return {
    task: {
      type: 'continue',
      value: {
        title,
        width: 'medium',
        height: 'large',
        card: {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            type: 'AdaptiveCard',
            version: '1.4',
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            body,
            actions: [action],
          },
        },
      },
    },
  };
}
