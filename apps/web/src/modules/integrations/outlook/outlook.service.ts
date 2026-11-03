import { STAFF_ROLES } from '@coex/shared/core/permissions';
import { createHash } from 'node:crypto';
import { Schema, model, models, Types } from 'mongoose';
import { getContext } from '@/lib/tenant-context';
import { repository } from '@/lib/repository';
import { fileStorage } from '@/lib/storage';
import { UserModel } from '@coex/shared/core/models/user.model';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { TaskCommentModel } from '@coex/shared/tasks/models/task-comment.model';
import { createTask, assignableUserIdsForTask } from '@/modules/tasks/services/task.service';
import { listSpaces, canOpenSpace } from '@/modules/tasks/services/space.service';
import { listFolders } from '@/modules/tasks/services/folder.service';
import { recordAudit } from '@/modules/core/services/audit.service';
import { outlookTaskSchema, emailDescription } from './protocol';
const Receipts =
  models.OutlookTaskReceipt ??
  model(
    'OutlookTaskReceipt',
    new Schema({ _id: String, taskId: String, state: String }, { timestamps: true }),
  );
export async function outlookChoices(canReadCustomers: boolean) {
  const { tenantId, userId } = getContext();
  const [spaces, folders, people, customers] = await Promise.all([
    listSpaces(),
    listFolders(),
    UserModel.find({
      tenantId,
      status: 'active',
      deletedAt: null,
      role: { $in: [...STAFF_ROLES] },
    }).select('name'),
    canReadCustomers ? repository(OrganisationModel).find({ status: 'active' }).select('name') : [],
  ]);
  return {
    actorId: String(userId),
    spaces: spaces.map((s) => ({ id: s.id, name: s.name, memberIds: s.memberIds })),
    folders: folders
      .filter((f) => spaces.some((s) => s.id === f.spaceId))
      .map((f) => ({ id: f.id, name: f.name, spaceId: f.spaceId, memberIds: f.memberIds })),
    people: people.map((p) => ({ id: String(p._id), name: p.name })),
    customers: customers.map((c) => ({ id: String(c._id), name: c.name })),
  };
}
export async function createOutlookTask(raw: unknown, canReadCustomers: boolean) {
  const parsed = outlookTaskSchema.safeParse(raw);
  if (!parsed.success) throw new Error('Check the title, destination, email and due date.');
  const input = parsed.data;
  const data = await outlookChoices(canReadCustomers);
  if (!(await canOpenSpace(input.spaceId)) || !data.spaces.some((s) => s.id === input.spaceId))
    throw new Error('Choose an available space.');
  if (
    input.folderId &&
    !data.folders.some((f) => f.id === input.folderId && f.spaceId === input.spaceId)
  )
    throw new Error('Choose an available folder in this space.');
  if (input.organisationId && !data.customers.some((c) => c.id === input.organisationId))
    throw new Error('Choose an available customer.');
  const allowed = await assignableUserIdsForTask(input);
  if (
    input.assigneeIds.some(
      (id) => !data.people.some((p) => p.id === id) || (allowed && !allowed.includes(id)),
    )
  )
    throw new Error('Choose staff who can access this destination.');
  const files = input.attachments.map((a) => ({ ...a, body: Buffer.from(a.base64, 'base64') }));
  if (
    files.some((f) => !f.body.length || f.body.length > 3 * 1024 * 1024) ||
    files.reduce((sum, f) => sum + f.body.length, 0) > 10 * 1024 * 1024
  )
    throw new Error('Use files up to 3MB each and 10MB total.');
  const { tenantId, userId } = getContext();
  const key = createHash('sha256')
    .update(`${tenantId}:${userId}:${input.mailbox.toLowerCase()}:${input.messageId}`)
    .digest('hex');
  try {
    await Receipts.create({ _id: key, state: 'pending' });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    const receipt = await Receipts.findById(key);
    if (receipt?.taskId)
      return {
        taskId: String(receipt.taskId),
        duplicate: true,
        attachmentWarning: receipt.state !== 'complete',
      };
    throw new Error('This email is already processing. Check your tasks before retrying.');
  }
  const stored: { fileName: string; contentType: string; storageKey: string; bytes: number }[] = [];
  let taskId: string | undefined;
  try {
    for (const file of files) {
      const saved = await fileStorage().put({
        tenantId: String(tenantId),
        fileName: file.fileName,
        contentType: file.contentType,
        body: file.body,
      });
      stored.push({
        fileName: file.fileName,
        contentType: file.contentType,
        storageKey: saved.key,
        bytes: saved.bytes,
      });
    }
    taskId = await createTask({
      spaceId: input.spaceId,
      folderId: input.folderId,
      organisationId: input.organisationId,
      title: input.title,
      description: emailDescription(input),
      assigneeIds: input.assigneeIds,
      endAt: input.dueDate ? `${input.dueDate}T17:00` : null,
    });
    await Receipts.updateOne({ _id: key }, { $set: { taskId } });
    if (stored.length) {
      const actor = await UserModel.findOne({ _id: userId, tenantId }).select('name');
      await repository(TaskCommentModel).create({
        taskId: new Types.ObjectId(taskId),
        authorUserId: userId,
        authorName: actor?.name ?? 'Staff',
        body: 'Attachments imported from Outlook email.',
        attachments: stored as never,
      });
    }
    await Receipts.updateOne({ _id: key }, { $set: { state: 'complete' } });
    await recordAudit({
      action: 'task.created_from_outlook',
      entityType: 'Task',
      entityId: new Types.ObjectId(taskId),
      after: { attachmentCount: stored.length },
    });
    return { taskId, duplicate: false, attachmentWarning: false };
  } catch (error) {
    if (!taskId)
      await Promise.allSettled(stored.map((file) => fileStorage().remove(file.storageKey)));
    // Keep a failed receipt: creation may have committed before a downstream notification failed.
    await Receipts.updateOne(
      { _id: key },
      { $set: { state: 'needs_review', ...(taskId ? { taskId } : {}) } },
    );
    throw error;
  }
}
