import type { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { getContext } from '@/lib/tenant-context';
import { toObjectId } from '@/lib/ids';
import { recordAudit } from '@/modules/core/services/audit.service';
import { UserModel } from '@/modules/core/models/user.model';
import { FolderModel } from '../models/folder.model';
import { TaskModel } from '../models/task.model';
import { actorIsAdministrator } from './access.service';

/**
 * Folders, and the one visibility rule in the task module.
 *
 * A folder with no members named on it is open: anyone who can open the space sees it. Name members
 * on it and it becomes private to exactly those people. That is the whole rule. An access model
 * people cannot recite is one they will get wrong, and getting it wrong means either a leak or work
 * that nobody can find.
 *
 * Two consequences follow, and both are enforced here rather than in a screen:
 *
 * A tenant administrator sees every folder. Somebody has to be able to administer the system and
 * answer "where did that task go", and pretending otherwise just means people work around it.
 *
 * A task in a private folder can only be assigned to a member of that folder. The alternative is
 * creating work its own owner cannot see, which is worse than any refusal.
 */

const folders = () => repository(FolderModel);

export interface FolderSummary {
  id: string;
  spaceId: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  memberIds: string[];
  memberNames: string[];
  sortOrder: number;
  openTaskCount: number;
  totalTaskCount: number;
}

/** A tenant administrator sees everything; anyone else sees open folders and their own. */
/** The ids of every folder this person may open, or null meaning no restriction applies. */
export async function visibleFolderIds(): Promise<Types.ObjectId[] | null> {
  await connectToDatabase();

  if (await actorIsAdministrator()) return null;

  const open = await folders()
    .find({ memberIds: { $size: 0 } })
    .select('_id');
  const mine = await folders().find({ memberIds: getContext().userId }).select('_id');

  return [...open, ...mine].map((folder) => folder._id);
}

/**
 * A task filter that hides work inside folders this person may not open.
 *
 * Tasks with no folder are always visible: they sit directly in the space, where nothing was ever
 * claimed to be private.
 */
export async function visibleFolderFilter(): Promise<Record<string, unknown>> {
  const ids = await visibleFolderIds();

  if (ids === null) return {};

  return { $or: [{ folderId: null }, { folderId: { $in: ids } }] };
}

/** Whether one folder may be opened, used before showing or writing anything inside it. */
export async function canOpenFolder(folderId: string): Promise<boolean> {
  await connectToDatabase();

  const folder = await folders().findById(folderId);
  if (!folder) return false;
  if (folder.memberIds.length === 0) return true;
  if (await actorIsAdministrator()) return true;

  return folder.memberIds.some((id) => String(id) === String(getContext().userId));
}

export async function listFolders(spaceId?: string): Promise<FolderSummary[]> {
  await connectToDatabase();

  const ids = await visibleFolderIds();

  const filter: Record<string, unknown> = { status: 'active' };
  if (spaceId) filter.spaceId = toObjectId(spaceId);
  if (ids !== null) filter._id = { $in: ids };

  const found = await folders().find(filter).sort({ sortOrder: 1, name: 1 });

  const memberIds = [
    ...new Set(found.flatMap((folder) => folder.memberIds.map((id) => String(id)))),
  ];

  const users = await UserModel.find({ _id: { $in: memberIds } }).select('name');
  const names = new Map(users.map((user) => [String(user._id), user.name]));

  return Promise.all(
    found.map(async (folder) => {
      const tasks = await TaskModel.find({
        tenantId: folder.tenantId,
        folderId: folder._id,
        deletedAt: null,
      }).select('isClosed');

      return {
        id: String(folder._id),
        spaceId: String(folder.spaceId),
        name: folder.name,
        description: folder.description ?? null,
        isPrivate: folder.memberIds.length > 0,
        memberIds: folder.memberIds.map((id) => String(id)),
        memberNames: folder.memberIds.map((id) => names.get(String(id)) ?? 'Unknown'),
        sortOrder: folder.sortOrder ?? 0,
        openTaskCount: tasks.filter((task) => !task.isClosed).length,
        totalTaskCount: tasks.length,
      };
    }),
  );
}

export async function getFolder(id: string) {
  await connectToDatabase();
  return folders().findById(id);
}

export interface FolderInput {
  spaceId: string;
  name: string;
  description?: string | null;
  memberIds?: string[];
}

export async function createFolder(input: FolderInput): Promise<string> {
  await connectToDatabase();

  const name = input.name.trim();
  if (!name) throw new Error('A folder needs a name.');

  const last = await folders()
    .find({ spaceId: toObjectId(input.spaceId) })
    .sort({ sortOrder: -1 })
    .limit(1);

  const created = await folders().create({
    spaceId: toObjectId(input.spaceId),
    name,
    description: input.description?.trim() || null,
    memberIds: (input.memberIds ?? []).filter(Boolean).map((id) => toObjectId(id)),
    sortOrder: (last[0]?.sortOrder ?? 0) + 10,
    status: 'active',
  });

  await recordAudit({
    action: 'folder.created',
    entityType: 'Folder',
    entityId: created._id,
    after: { name, private: created.memberIds.length > 0 },
  });

  return String(created._id);
}

export async function updateFolder(
  id: string,
  input: { name: string; description?: string | null; memberIds?: string[] },
): Promise<void> {
  await connectToDatabase();

  const folder = await folders().findById(id);
  if (!folder) throw new Error('Folder not found.');

  const name = input.name.trim();
  if (!name) throw new Error('A folder needs a name.');

  const memberIds = (input.memberIds ?? []).filter(Boolean).map((value) => toObjectId(value));

  // Closing a folder around work that is already assigned elsewhere would hide that work from the
  // people doing it, so the change is refused and the names are given rather than guessed at.
  if (memberIds.length > 0) {
    const inside = await TaskModel.find({
      tenantId: folder.tenantId,
      folderId: folder._id,
      deletedAt: null,
      isClosed: false,
    }).select('assigneeIds number');

    const allowed = new Set(memberIds.map(String));

    const stranded = inside.filter((task) =>
      task.assigneeIds.some((assignee) => !allowed.has(String(assignee))),
    );

    if (stranded.length > 0) {
      throw new Error(
        `${stranded.length} open ${stranded.length === 1 ? 'task is' : 'tasks are'} assigned to people outside this list, starting with ${stranded[0].number}. Add them, or reassign the work first.`,
      );
    }
  }

  await folders().updateOne(
    { _id: folder._id },
    { $set: { name, description: input.description?.trim() || null, memberIds } },
  );

  await recordAudit({
    action: 'folder.updated',
    entityType: 'Folder',
    entityId: folder._id,
    before: { name: folder.name, private: folder.memberIds.length > 0 },
    after: { name, private: memberIds.length > 0 },
  });
}

/**
 * Archiving a folder, never deleting it.
 *
 * The work inside comes out into the space rather than disappearing with the folder, because a
 * folder is a way of grouping and removing it should not remove what was grouped.
 */
/**
 * Setting a manual order on the folders of one space, from a drag in the sidebar tree.
 *
 * Scoped to spaceId so a dragged order in one space can never touch another space's folders, even
 * if a bad id somehow ended up in the list sent from the client.
 */
export async function reorderFolders(spaceId: string, orderedIds: string[]): Promise<void> {
  await connectToDatabase();

  await Promise.all(
    orderedIds.map((id, index) =>
      folders().updateOne(
        { _id: toObjectId(id), spaceId: toObjectId(spaceId) },
        { $set: { sortOrder: (index + 1) * 10 } },
      ),
    ),
  );
}

export async function archiveFolder(id: string): Promise<void> {
  await connectToDatabase();

  const folder = await folders().findById(id);
  if (!folder) throw new Error('Folder not found.');

  await TaskModel.updateMany(
    { tenantId: folder.tenantId, folderId: folder._id },
    { $set: { folderId: null } },
  );

  await folders().updateOne({ _id: folder._id }, { $set: { status: 'archived' } });

  await recordAudit({
    action: 'folder.archived',
    entityType: 'Folder',
    entityId: folder._id,
    before: { name: folder.name },
  });
}

/** Who may be given work inside this folder: everyone, or its members when it is private. */
export async function assignableMemberIds(folderId: string | null): Promise<string[] | null> {
  if (!folderId) return null;

  await connectToDatabase();

  const folder = await folders().findById(folderId);
  if (!folder || folder.memberIds.length === 0) return null;

  return folder.memberIds.map((id) => String(id));
}
