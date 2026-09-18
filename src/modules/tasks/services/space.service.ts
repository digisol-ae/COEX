import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { toObjectId, toOptionalObjectId } from '@/lib/ids';
import { recordAudit } from '@/modules/core/services/audit.service';
import { SpaceModel } from '../models/space.model';
import { TaskModel } from '../models/task.model';
import { visibleFolderFilter } from './folder.service';

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
}

export async function listSpaces(): Promise<SpaceSummary[]> {
  await connectToDatabase();

  const found = await spaces().find().sort({ name: 1 });

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
      };
    }),
  );
}

export async function getSpace(id: string) {
  await connectToDatabase();
  return spaces().findById(id);
}

export interface SpaceInput {
  name: string;
  description?: string;
  organisationId?: string | null;
  dueDate?: string | null;
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
  });

  await recordAudit({
    action: 'space.created',
    entityType: 'Space',
    entityId: created._id,
    after: { name: created.name },
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

export async function archiveSpace(id: string): Promise<void> {
  await connectToDatabase();

  const removed = await spaces().softDelete({ _id: toObjectId(id) });
  if (!removed) throw new Error('Space not found.');

  await recordAudit({
    action: 'space.archived',
    entityType: 'Space',
    entityId: removed._id,
    before: { name: removed.name },
  });
}
