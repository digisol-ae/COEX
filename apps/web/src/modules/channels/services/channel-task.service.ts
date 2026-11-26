import mongoose from 'mongoose';
import { z } from 'zod';
import { ChannelMessageModel } from '@coex/shared/channels/models/channel-message.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { TaskModel } from '@coex/shared/tasks/models/task.model';
import { SpaceModel } from '@coex/shared/tasks/models/space.model';
import { effectiveModules } from '@coex/shared/core/modules';
import { workspaceAccess } from '@coex/shared/core/saas';
import { ActivityModel } from '@coex/shared/crm/models/activity.model';
import { permissionsFor } from '@coex/shared/core/permissions';
import { getContext } from '@/lib/tenant-context';
import { assertModuleAccess } from '@/modules/core/services/module-access.service';
import { recordAudit } from '@/modules/core/services/audit.service';
import { lockSubscription } from '@/modules/core/services/subscription.service';
import { nextNumber } from '@/modules/core/services/numbering.service';
import { getSpace } from '@/modules/tasks/services/space.service';
import { getTask } from '@/modules/tasks/services/task.service';

const inputSchema = z.object({
  messageId: z.string().regex(/^[a-f\d]{24}$/i),
  spaceId: z.string().regex(/^[a-f\d]{24}$/i),
  title: z.string().trim().min(1).max(240),
});

/** Setup message tools remain restricted to workspace administrators with task rights. */
export async function createTaskFromChannelMessage(
  input: z.input<typeof inputSchema>,
): Promise<string> {
  const values = inputSchema.parse(input);
  await assertModuleAccess('tickets');
  await assertModuleAccess('tasks');
  const { tenantId, userId } = getContext();
  const actor = await UserModel.findOne({
    _id: userId,
    tenantId,
    status: 'active',
    deletedAt: null,
  });
  const permissions = actor ? permissionsFor(actor) : new Set<string>();
  if (
    !(['tenant.manage', 'ticket.manage', 'task.manage'] as const).every((permission) =>
      permissions.has(permission),
    )
  )
    throw new Error('You are not allowed to create tasks from channel messages.');
  const source = await ChannelMessageModel.findOne({
    _id: values.messageId,
    tenantId,
    direction: 'in',
  });
  if (!source) throw new Error('Message unavailable.');
  if (source.account === 'crm') await assertModuleAccess('crm');
  if (source.taskId) {
    const existing = await getTask(String(source.taskId));
    if (!existing) throw new Error('The linked task is unavailable.');
    return String(existing._id);
  }
  const space = await getSpace(values.spaceId);
  if (!space) throw new Error('Space unavailable.');
  const number = await nextNumber('task');
  let taskId = '';
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const tenant = await lockSubscription(String(tenantId), session);
      const modules = effectiveModules(tenant);
      if (
        workspaceAccess(tenant.status, tenant.commercial) !== 'allowed' ||
        !modules.tasks ||
        !modules.tickets ||
        (source.account === 'crm' && !modules.crm)
      )
        throw new Error('This module is unavailable for the workspace.');
      const message = await ChannelMessageModel.findOne({
        _id: source._id,
        tenantId,
        direction: 'in',
      }).session(session);
      if (!message) throw new Error('Message unavailable.');
      if (message.taskId) {
        taskId = String(message.taskId);
        return;
      }
      // Serialize destination archival/membership updates with creation.
      const destination = await SpaceModel.findOneAndUpdate(
        { _id: space._id, tenantId, deletedAt: null },
        { $set: { updatedAt: new Date() } },
        { session, returnDocument: 'after' },
      );
      if (
        !destination ||
        (destination.isPersonal && String(destination.ownerId) !== String(userId))
      )
        throw new Error('Space unavailable.');
      if (
        destination.memberIds.length &&
        !['tenant_admin', 'platform_admin'].includes(actor!.role) &&
        !destination.memberIds.some((member) => String(member) === String(userId))
      )
        throw new Error('Space unavailable.');
      const column = [...destination.statuses].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      )[0];
      const [task] = await TaskModel.create(
        [
          {
            tenantId,
            number,
            title: values.title,
            description: `From WhatsApp (${message.account})\n${message.text || `[${message.type} message]`}${message.media ? '\n\nAttachments remain in the original conversation.' : ''}`,
            spaceId: space._id,
            folderId: null,
            status: column?.name ?? 'To do',
            isClosed: column?.isClosed ?? false,
            closedAt: column?.isClosed ? new Date() : null,
            createdById: userId,
            sortOrder: Date.now(),
            organisationId: space.organisationId ?? null,
          },
        ],
        { session },
      );
      message.taskId = task._id;
      await message.save({ session });
      taskId = String(task._id);
      await recordAudit(
        {
          action: 'channel.task_created',
          entityType: 'Task',
          entityId: task._id,
          after: {
            channelMessageId: String(message._id),
            number,
            title: values.title,
            spaceId: String(space._id),
          },
        },
        session,
      );
      if (space.organisationId)
        await ActivityModel.create(
          [
            {
              tenantId,
              organisationId: space.organisationId,
              kind: 'task_created',
              summary: `${number} ${values.title}`,
              sourceModule: 'tasks',
              sourceId: task._id,
              actorId: userId,
            },
          ],
          { session },
        );
    });
  } finally {
    await session.endSession();
  }
  // A concurrent creator may have selected a different private destination.
  if (!(await getTask(taskId))) throw new Error('The linked task is unavailable.');
  return taskId;
}
