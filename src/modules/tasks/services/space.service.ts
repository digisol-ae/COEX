import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { toObjectId, toOptionalObjectId } from '@/lib/ids';
import { recordAudit } from '@/modules/core/services/audit.service';
import { SpaceModel } from '../models/space.model';
import { TaskModel } from '../models/task.model';
import { FolderModel } from '../models/folder.model';
import { TimeEntryModel } from '@/modules/time/models/time-entry.model';
import { visibleFolderFilter } from './folder.service';
import { getContext } from '@/lib/tenant-context';
import { actorIsAdministrator } from './access.service';

/**
 * Spaces.
 *
 * The top of four levels: space, folder, task, subtask. A space is the body of work a team talks
 * about by name; folders group the work inside it and are the only place visibility is decided.
 */

const spaces = () => repository(SpaceModel);

/**
 * Progress as a percentage.
 *
 * Weighted by estimate when estimates exist, because ten trivial tasks and one large one are not
 * eleven equal units of work, and counting them that way makes a space look nearly finished when
 * the hard part has not started. Tasks with no estimate count as one unit each, so a space with no
 * estimates falls back to a simple count of what is closed.
 */
export function progressPercent(
  tasks: { isClosed: boolean; estimateMinutes: number | null }[],
): number {
  if (tasks.length === 0) return 0;

  const weightOf = (task: { estimateMinutes: number | null }) =>
    task.estimateMinutes && task.estimateMinutes > 0 ? task.estimateMinutes : 60;

  const total = tasks.reduce((sum, task) => sum + weightOf(task), 0);
  const done = tasks.filter((task) => task.isClosed).reduce((sum, task) => sum + weightOf(task), 0);

  return Math.round((done / total) * 100);
}

export interface SpaceSummary {
  id: string;
  name: string;
  description: string | null;
  organisationId: string | null;
  organisationName: string | null;
  dueDate: Date | null;
  statuses: { name: string; isClosed: boolean }[];
  openTaskCount: number;
  totalTaskCount: number;
  progressPercent: number;
  status: string;
  isPrivate: boolean;
  memberIds: string[];
}

export async function visibleSpaceIds(): Promise<import('mongoose').Types.ObjectId[] | null> {
  await connectToDatabase();
  // Personal work is private even from an administrator. It is an individual's capture pad, not
  // a private project a manager needs access to administer.
  if (await actorIsAdministrator()) {
    const visible = await spaces().find({ $or: [{ isPersonal: { $ne: true } }, { ownerId: getContext().userId }] }).select('_id');
    return visible.map((space) => space._id);
  }
  const open = await spaces()
    .find({ memberIds: { $size: 0 } })
    .select('_id');
  const mine = await spaces().find({ memberIds: getContext().userId }).select('_id');
  return [...open, ...mine].map((space) => space._id);
}

export async function visibleSpaceFilter(field = '_id'): Promise<Record<string, unknown>> {
  const ids = await visibleSpaceIds();
  return ids === null ? {} : { [field]: { $in: ids } };
}

export async function canOpenSpace(id: string): Promise<boolean> {
  await connectToDatabase();
  const space = await spaces().findById(id);
  if (!space) return false;
  if (space.isPersonal) return String(space.ownerId) === String(getContext().userId);
  return (
    space.memberIds.length === 0 ||
    (await actorIsAdministrator()) ||
    space.memberIds.some((member) => String(member) === String(getContext().userId))
  );
}

export async function assignableSpaceMemberIds(id: string): Promise<string[] | null> {
  const space = await spaces().findById(id);
  if (!space || space.memberIds.length === 0) return null;
  return space.memberIds.map(String);
}

export async function listSpaces(): Promise<SpaceSummary[]> {
  await connectToDatabase();

  const found = await spaces()
    .find({ ...(await visibleSpaceFilter()), isPersonal: { $ne: true } })
    .sort({ sortOrder: 1, name: 1 });

  // Counts respect folder privacy, so a space does not advertise the size of work the person
  // cannot open. A count that does not match the list is how people conclude a tool is lying.
  const folderScope = await visibleFolderFilter();

  return Promise.all(
    found.map(async (space) => {
      const tasks = await TaskModel.find({
        tenantId: space.tenantId,
        spaceId: space._id,
        deletedAt: null,
        ...folderScope,
      }).select('isClosed estimateMinutes');

      return {
        id: String(space._id),
        name: space.name,
        description: space.description ?? null,
        organisationId: space.organisationId ? String(space.organisationId) : null,
        organisationName: null,
        dueDate: space.dueDate ?? null,
        statuses: space.statuses.map((status) => ({
          name: status.name,
          isClosed: status.isClosed ?? false,
        })),
        openTaskCount: tasks.filter((task) => !task.isClosed).length,
        totalTaskCount: tasks.length,
        progressPercent: progressPercent(
          tasks.map((task) => ({
            isClosed: task.isClosed ?? false,
            estimateMinutes: task.estimateMinutes ?? null,
          })),
        ),
        status: space.status,
        isPrivate: space.memberIds.length > 0,
        memberIds: space.memberIds.map(String),
      };
    }),
  );
}

export async function getSpace(id: string) {
  await connectToDatabase();
  if (!(await canOpenSpace(id))) return null;
  return spaces().findById(id);
}

export interface SpaceInput {
  name: string;
  description?: string;
  organisationId?: string | null;
  dueDate?: string | null;
  memberIds?: string[];
}

export async function createSpace(input: SpaceInput): Promise<string> {
  await connectToDatabase();

  const name = input.name.trim();
  if (!name) throw new Error('A space needs a name.');

  const created = await spaces().create({
    name,
    description: input.description?.trim() || null,
    organisationId: toOptionalObjectId(input.organisationId),
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    memberIds: (input.memberIds ?? []).filter(Boolean).map(toObjectId),
  });

  await recordAudit({
    action: 'space.created',
    entityType: 'Space',
    entityId: created._id,
    after: { name: created.name },
  });

  return String(created._id);
}

/**
 * A private, automatic home for work captured from My tasks. The data model keeps every task in
 * a Space for statuses and access checks, but people should not have to create one just to note a
 * task for themselves.
 */
export async function personalSpaceForCurrentUser(): Promise<string> {
  await connectToDatabase();
  const userId = getContext().userId;
  // Never adopt a normal Space merely because somebody happened to call it “My tasks”. That was
  // letting ordinary project work leak into Personal for its owner.
  const existing = await spaces().findOne({ ownerId: userId, isPersonal: true });
  if (existing) return String(existing._id);

  const created = await spaces().create({
    name: 'Personal',
    description: 'Private personal work captured from Personal.',
    ownerId: userId,
    isPersonal: true,
    memberIds: [userId],
  });
  return String(created._id);
}

export async function renameSpace(id: string, name: string): Promise<void> {
  await connectToDatabase();

  const trimmed = name.trim();
  if (!trimmed) throw new Error('A space needs a name.');

  const space = await spaces().updateOne({ _id: toObjectId(id) }, { $set: { name: trimmed } });
  if (!space) throw new Error('Space not found.');

  await recordAudit({
    action: 'space.renamed',
    entityType: 'Space',
    entityId: space._id,
    after: { name: trimmed },
  });
}

export async function updateSpace(id: string, input: SpaceInput): Promise<void> {
  await connectToDatabase();
  const space = await spaces().findById(id);
  if (!space) throw new Error('Space not found.');
  const name = input.name.trim();
  if (!name) throw new Error('A space needs a name.');
  const memberIds = (input.memberIds ?? []).filter(Boolean).map(toObjectId);
  await spaces().updateOne(
    { _id: space._id },
    {
      $set: {
        name,
        description: input.description?.trim() || null,
        organisationId: toOptionalObjectId(input.organisationId),
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        memberIds,
      },
    },
  );
  await recordAudit({
    action: 'space.updated',
    entityType: 'Space',
    entityId: space._id,
    before: { name: space.name, private: space.memberIds.length > 0 },
    after: { name, private: memberIds.length > 0 },
  });
}

/**
 * Setting a manual order on the Spaces list, from a drag.
 *
 * The client sends the full list in its new order; this just writes a sortOrder that matches it,
 * spaced by ten so a later single-item reorder never needs to touch every row again. Only ids the
 * caller may actually see are written, so dragging cannot be used to reorder a space nobody showed
 * the person in the first place.
 */
export async function reorderSpaces(orderedIds: string[]): Promise<void> {
  await connectToDatabase();

  const visible = await visibleSpaceIds();
  const allowed = visible === null ? null : new Set(visible.map(String));

  await Promise.all(
    orderedIds.map((id, index) => {
      if (allowed && !allowed.has(id)) return Promise.resolve();
      return spaces().updateOne({ _id: toObjectId(id) }, { $set: { sortOrder: (index + 1) * 10 } });
    }),
  );
}

export interface ArchiveSummary {
  tasks: number;
  folders: number;
}

/** What archiving would take with it, for the confirmation before anyone commits to it. */
export async function archiveImpact(id: string): Promise<ArchiveSummary> {
  await connectToDatabase();
  const { tenantId } = getContext();
  const space = await spaces().findById(id);
  if (!space) throw new Error('Space not found.');
  const [tasks, folders] = await Promise.all([
    TaskModel.countDocuments({ tenantId, spaceId: space._id, deletedAt: null }),
    FolderModel.countDocuments({ tenantId, spaceId: space._id, status: 'active' }),
  ]);
  return { tasks, folders };
}

/**
 * Archives a Space with its folders, tasks and their subtasks (John, 28 Sep 2026). Nothing is
 * deleted: everything disappears from lists, boards, the menu and My tasks, and comes back as it
 * was on restore. Logged time stays, because timesheets and invoices already count it. A timer
 * still running inside the Space stops the archive, so nobody's clock ends up on hidden work.
 */
export async function archiveSpace(id: string): Promise<ArchiveSummary> {
  await connectToDatabase();
  const { tenantId } = getContext();

  const space = await spaces().findById(id);
  if (!space) throw new Error('Space not found.');
  if (!(await canOpenSpace(id))) throw new Error('You cannot open this space.');

  const taskIds = (
    await TaskModel.find({ tenantId, spaceId: space._id, deletedAt: null }).select('_id')
  ).map((task) => task._id);

  const running = await TimeEntryModel.findOne({
    tenantId,
    taskId: { $in: taskIds },
    running: true,
  }).populate<{ userId: { name: string } }>('userId', 'name');
  if (running) {
    throw new Error(
      `${running.userId?.name ?? 'Someone'} has a timer running in this space. Stop it before archiving.`,
    );
  }

  const now = new Date();
  const tasks = await TaskModel.updateMany(
    { tenantId, _id: { $in: taskIds } },
    { $set: { deletedAt: now, archivedWithSpace: true } },
  );
  const folders = await FolderModel.updateMany(
    { tenantId, spaceId: space._id, status: 'active' },
    { $set: { status: 'archived', archivedWithSpace: true } },
  );
  await SpaceModel.updateOne(
    { _id: space._id, tenantId },
    { $set: { deletedAt: now, status: 'archived' } },
  );

  const summary = { tasks: tasks.modifiedCount, folders: folders.modifiedCount };
  await recordAudit({
    action: 'space.archived',
    entityType: 'Space',
    entityId: space._id,
    before: { name: space.name },
    after: summary,
  });
  return summary;
}

/** Brings a Space back with exactly what was archived with it; earlier archives stay archived. */
export async function restoreSpace(id: string): Promise<ArchiveSummary> {
  await connectToDatabase();
  const { tenantId } = getContext();

  const space = await spaces().findOne(
    { _id: toObjectId(id), deletedAt: { $ne: null } },
    { withDeleted: true },
  );
  if (!space) throw new Error('Archived space not found.');
  if (
    space.memberIds.length > 0 &&
    !(await actorIsAdministrator()) &&
    !space.memberIds.some((member) => String(member) === String(getContext().userId))
  ) {
    throw new Error('You cannot open this space.');
  }

  const tasks = await TaskModel.updateMany(
    { tenantId, spaceId: space._id, archivedWithSpace: true },
    { $set: { deletedAt: null, archivedWithSpace: false } },
  );
  const folders = await FolderModel.updateMany(
    { tenantId, spaceId: space._id, archivedWithSpace: true },
    { $set: { status: 'active', archivedWithSpace: false } },
  );
  await SpaceModel.updateOne(
    { _id: space._id, tenantId },
    { $set: { deletedAt: null, status: 'active' } },
  );

  const summary = { tasks: tasks.modifiedCount, folders: folders.modifiedCount };
  await recordAudit({
    action: 'space.restored',
    entityType: 'Space',
    entityId: space._id,
    after: { name: space.name, ...summary },
  });
  return summary;
}

export interface ArchivedSpace {
  id: string;
  name: string;
  archivedAt: Date;
  taskCount: number;
}

/** Archived spaces the person could open, newest first, for the Restore list. */
export async function listArchivedSpaces(): Promise<ArchivedSpace[]> {
  await connectToDatabase();
  const { tenantId, userId } = getContext();
  const administrator = await actorIsAdministrator();
  const found = await spaces()
    .find(
      {
        deletedAt: { $ne: null },
        ...(administrator ? {} : { $or: [{ memberIds: { $size: 0 } }, { memberIds: userId }] }),
      },
      { withDeleted: true },
    )
    .sort({ deletedAt: -1 });
  return Promise.all(
    found.map(async (space) => ({
      id: String(space._id),
      name: space.name,
      archivedAt: space.deletedAt!,
      taskCount: await TaskModel.countDocuments({
        tenantId,
        spaceId: space._id,
        archivedWithSpace: true,
      }),
    })),
  );
}
