import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { toObjectId, toOptionalObjectId } from '@/lib/ids';
import { recordAudit } from '@/modules/core/services/audit.service';
import { ProjectModel } from '../models/project.model';
import { TaskModel } from '../models/task.model';

/**
 * Projects.
 *
 * The top of the structure: project, then task, then subtask. Phases such as Discovery or Design
 * are a field on the task rather than a level of their own, so work moves between phases without
 * being moved between lists, and a new phase can be added to a running project without
 * reorganising it.
 */

const projects = () => repository(ProjectModel);

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  organisationId: string | null;
  organisationName: string | null;
  dueDate: Date | null;
  statuses: { name: string; isClosed: boolean }[];
  phases: string[];
  openTaskCount: number;
  totalTaskCount: number;
  status: string;
}

export async function listProjects(): Promise<ProjectSummary[]> {
  await connectToDatabase();

  const found = await projects().find().sort({ name: 1 });

  return Promise.all(
    found.map(async (project) => ({
      id: String(project._id),
      name: project.name,
      description: project.description ?? null,
      organisationId: project.organisationId ? String(project.organisationId) : null,
      organisationName: null,
      dueDate: project.dueDate ?? null,
      statuses: project.statuses.map((status) => ({
        name: status.name,
        isClosed: status.isClosed ?? false,
      })),
      phases: project.phases ?? [],
      openTaskCount: await TaskModel.countDocuments({
        tenantId: project.tenantId,
        projectId: project._id,
        isClosed: false,
        deletedAt: null,
      }),
      totalTaskCount: await TaskModel.countDocuments({
        tenantId: project.tenantId,
        projectId: project._id,
        deletedAt: null,
      }),
      status: project.status,
    })),
  );
}

export async function getProject(id: string) {
  await connectToDatabase();
  return projects().findById(id);
}

export interface ProjectInput {
  name: string;
  description?: string;
  organisationId?: string | null;
  dueDate?: string | null;
  phases?: string[];
}

export async function createProject(input: ProjectInput): Promise<string> {
  await connectToDatabase();

  const created = await projects().create({
    name: input.name.trim(),
    description: input.description?.trim() || null,
    organisationId: toOptionalObjectId(input.organisationId),
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    phases: (input.phases ?? []).map((phase) => phase.trim()).filter(Boolean),
  });

  await recordAudit({
    action: 'project.created',
    entityType: 'Project',
    entityId: created._id,
    after: { name: created.name },
  });

  return String(created._id);
}

export async function updateProjectPhases(id: string, phases: string[]): Promise<void> {
  await connectToDatabase();

  const cleaned = phases.map((phase) => phase.trim()).filter(Boolean);
  const project = await projects().updateOne(
    { _id: toObjectId(id) },
    { $set: { phases: cleaned } },
  );

  if (!project) throw new Error('Project not found.');

  await recordAudit({
    action: 'project.phases_changed',
    entityType: 'Project',
    entityId: project._id,
    after: { phases: cleaned },
  });
}

export async function archiveProject(id: string): Promise<void> {
  await connectToDatabase();

  const removed = await projects().softDelete({ _id: toObjectId(id) });
  if (!removed) throw new Error('Project not found.');

  await recordAudit({
    action: 'project.archived',
    entityType: 'Project',
    entityId: removed._id,
    before: { name: removed.name },
  });
}
