import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { recordAudit } from '@/modules/core/services/audit.service';
import { PortfolioModel } from '../models/portfolio.model';
import { ProjectModel } from '../models/project.model';
import { TaskModel } from '../models/task.model';
import { DEFAULT_STATUSES } from '../models/project.model';
import { toObjectId, toOptionalObjectId } from '@/lib/ids';

/** Portfolios and the projects inside them. Two levels, deliberately. */

const portfolios = () => repository(PortfolioModel);
const projects = () => repository(ProjectModel);

export interface PortfolioSummary {
  id: string;
  name: string;
  description: string | null;
  projectCount: number;
  openTaskCount: number;
}

export async function listPortfolios(): Promise<PortfolioSummary[]> {
  await connectToDatabase();

  const found = await portfolios()
    .find({ status: 'active' as const })
    .sort({ sortOrder: 1, name: 1 });

  return Promise.all(
    found.map(async (portfolio) => ({
      id: String(portfolio._id),
      name: portfolio.name,
      description: portfolio.description ?? null,
      projectCount: await ProjectModel.countDocuments({
        tenantId: portfolio.tenantId,
        portfolioId: portfolio._id,
        deletedAt: null,
      }),
      openTaskCount: await TaskModel.countDocuments({
        tenantId: portfolio.tenantId,
        portfolioId: portfolio._id,
        isClosed: false,
        deletedAt: null,
      }),
    })),
  );
}

export async function createPortfolio(input: {
  name: string;
  description?: string;
}): Promise<string> {
  await connectToDatabase();

  const created = await portfolios().create({
    name: input.name.trim(),
    description: input.description?.trim() || null,
  });

  await recordAudit({
    action: 'portfolio.created',
    entityType: 'Portfolio',
    entityId: created._id,
    after: { name: created.name },
  });

  return String(created._id);
}

export interface ProjectSummary {
  id: string;
  portfolioId: string;
  portfolioName: string;
  name: string;
  description: string | null;
  organisationId: string | null;
  dueDate: Date | null;
  statuses: { name: string; isClosed: boolean }[];
  openTaskCount: number;
  totalTaskCount: number;
  status: string;
}

export async function listProjects(portfolioId?: string): Promise<ProjectSummary[]> {
  await connectToDatabase();

  const query = portfolioId ? { portfolioId: toObjectId(portfolioId) } : {};
  const found = await projects().find(query).sort({ name: 1 });

  const portfolioNames = new Map(
    (await portfolios().find()).map((portfolio) => [String(portfolio._id), portfolio.name]),
  );

  return Promise.all(
    found.map(async (project) => ({
      id: String(project._id),
      portfolioId: String(project.portfolioId),
      portfolioName: portfolioNames.get(String(project.portfolioId)) ?? 'Unknown',
      name: project.name,
      description: project.description ?? null,
      organisationId: project.organisationId ? String(project.organisationId) : null,
      dueDate: project.dueDate ?? null,
      statuses: (project.statuses ?? DEFAULT_STATUSES).map((status) => ({
        name: status.name,
        isClosed: status.isClosed ?? false,
      })),
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

export async function createProject(input: {
  portfolioId: string;
  name: string;
  description?: string;
  organisationId?: string | null;
  dueDate?: string | null;
}): Promise<string> {
  await connectToDatabase();

  const created = await projects().create({
    portfolioId: toObjectId(input.portfolioId),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    organisationId: toOptionalObjectId(input.organisationId),
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    // The schema default supplies the standard columns; a project may be reconfigured later.
  });

  await recordAudit({
    action: 'project.created',
    entityType: 'Project',
    entityId: created._id,
    after: { name: created.name },
  });

  return String(created._id);
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
