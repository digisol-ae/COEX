import { assertModuleAccess } from '@/modules/core/services/module-access.service';
import { recordAudit } from '@/modules/core/services/audit.service';
import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { toObjectId } from '@/lib/ids';
import { FolderModel } from '@coex/shared/tasks/models/folder.model';
import { TaskModel } from '@coex/shared/tasks/models/task.model';
import { SpaceModel } from '@coex/shared/tasks/models/space.model';
import { taskAssigneeIds } from '@coex/shared/tasks/assignees';
import { canOpenFolder } from './folder.service';
import { getSpace } from './space.service';
import { actorIsAdministrator } from './access.service';

export interface ArchivedFolder {
  id: string;
  name: string;
  taskCount: number;
  legacyArchive: boolean;
}

export async function listArchivedFolders(spaceId: string): Promise<ArchivedFolder[]> {
  await assertModuleAccess('tasks');
  await connectToDatabase();
  if (!(await getSpace(spaceId))) return [];
  const { tenantId, userId } = getContext();
  const administrator = await actorIsAdministrator();
  const folders = await FolderModel.find({
    tenantId,
    spaceId: toObjectId(spaceId),
    status: 'archived',
    deletedAt: null,
    ...(administrator ? {} : { $or: [{ memberIds: { $size: 0 } }, { memberIds: userId }] }),
  }).sort({ archivedAt: -1, name: 1 });
  return folders.map((folder) => ({
    id: String(folder._id),
    name: folder.name,
    taskCount: folder.archivedTaskIds?.length ?? 0,
    legacyArchive: folder.archivedTaskIds == null,
  }));
}

/** Restore only work recorded by this archive; individually archived work stays archived. */
export async function restoreFolder(id: string): Promise<{ tasks: number }> {
  await assertModuleAccess('tasks');
  await connectToDatabase();
  if (!(await canOpenFolder(id))) throw new Error('Folder not found.');
  const { tenantId } = getContext();
  const visible = await FolderModel.findOne({ _id: toObjectId(id), tenantId, deletedAt: null });
  if (!visible || !(await getSpace(String(visible.spaceId))))
    throw new Error('Restore the Space first.');
  return FolderModel.db.transaction(async (session) => {
    const folder = await FolderModel.findOne({
      _id: visible._id,
      tenantId,
      status: 'archived',
      deletedAt: null,
    }).session(session);
    if (!folder) throw new Error('This folder is no longer archived. Refresh and try again.');
    const space = await SpaceModel.findOne({
      _id: folder.spaceId,
      tenantId,
      deletedAt: null,
      status: { $ne: 'archived' },
    }).session(session);
    if (!space) throw new Error('Restore the Space first.');
    const archived = await TaskModel.find({
      tenantId,
      folderId: folder._id,
      _id: { $in: folder.archivedTaskIds ?? [] },
      archivedWithFolder: true,
      deletedAt: folder.archivedAt,
    }).session(session);
    const allowed = [space.memberIds, folder.memberIds]
      .filter((ids) => ids.length > 0)
      .map((ids) => new Set(ids.map(String)));
    if (
      archived.some((task) =>
        taskAssigneeIds(task).some((id) => allowed.some((members) => !members.has(id))),
      )
    )
      throw new Error(
        'Some archived work belongs to people outside the current Space or Folder members. Update membership before restoring.',
      );
    await FolderModel.updateOne(
      { _id: folder._id, tenantId, status: 'archived' },
      { $set: { status: 'active', archivedAt: null, archivedTaskIds: [] } },
      { session },
    );
    const result = await TaskModel.updateMany(
      {
        tenantId,
        _id: { $in: archived.map((task) => task._id) },
        archivedWithFolder: true,
        deletedAt: folder.archivedAt,
      },
      { $set: { deletedAt: null, archivedWithFolder: false } },
      { session },
    );
    await recordAudit(
      {
        action: 'folder.restored',
        entityType: 'Folder',
        entityId: folder._id,
        before: { status: 'archived' },
        after: {
          status: 'active',
          tasks: result.modifiedCount,
          legacyFolderOnly: folder.archivedTaskIds == null,
        },
      },
      session,
    );
    return { tasks: result.modifiedCount };
  });
}
