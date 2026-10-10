import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { getContext } from '@/lib/tenant-context';
import { recordAudit } from '@/modules/core/services/audit.service';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { PipelineStageModel } from '@coex/shared/crm/models/pipeline-stage.model';
import { OpportunityModel } from '@coex/shared/crm/models/opportunity.model';
import {
  DEFAULT_STAGES,
  DEFAULT_STALE_DAYS,
  clampProbability,
  type StageKind,
} from '@coex/shared/crm/opportunity-rules';
import { actorCan } from './access.service';

/**
 * The tenant's sales pipeline: stages and the reasons a deal is lost (Full CRM, P2.2b).
 *
 * One pipeline per tenant. Same rules as a Space's workflow: stages are ordered, a stage cannot be
 * renamed or removed while opportunities sit in it, and exactly one stage means won and one lost.
 */

const stages = () => repository(PipelineStageModel);
const opportunities = () => repository(OpportunityModel);

export interface StageSummary {
  id: string;
  name: string;
  kind: StageKind;
  probability: number;
  sortOrder: number;
  opportunityCount: number;
}

async function requirePipelineManage(): Promise<void> {
  if (!(await actorCan('pipeline.manage'))) throw new Error('You may not change the pipeline.');
}

/** Creates the starting stages the first time a tenant uses the pipeline. */
async function ensureDefaultStages(): Promise<void> {
  if ((await stages().count()) > 0) return;

  for (const [index, stage] of DEFAULT_STAGES.entries()) {
    await stages().create({ ...stage, sortOrder: (index + 1) * 10 });
  }
}

export async function listStages(): Promise<StageSummary[]> {
  await connectToDatabase();
  await ensureDefaultStages();

  const found = await stages().find().sort({ sortOrder: 1 });
  const { tenantId } = getContext();

  return Promise.all(
    found.map(async (stage) => ({
      id: String(stage._id),
      name: stage.name,
      kind: stage.kind as StageKind,
      probability: stage.probability ?? 0,
      sortOrder: stage.sortOrder ?? 0,
      opportunityCount: await OpportunityModel.countDocuments({
        tenantId,
        stageId: stage._id,
        deletedAt: null,
      }),
    })),
  );
}

async function nameTaken(name: string, exceptId?: string): Promise<boolean> {
  const wanted = name.trim().toLowerCase();
  const all = await stages().find();
  return all.some((stage) => stage.name.toLowerCase() === wanted && String(stage._id) !== exceptId);
}

/** A new stage is always an open one, placed just before Won so the outcomes stay at the end. */
export async function addStage(input: { name: string; probability: number }): Promise<void> {
  await connectToDatabase();
  await requirePipelineManage();
  await ensureDefaultStages();

  const name = input.name.trim();
  if (!name) throw new Error('A stage needs a name.');
  if (await nameTaken(name)) throw new Error('There is already a stage with that name.');

  const all = await stages().find().sort({ sortOrder: 1 });
  const won = all.find((stage) => stage.kind === 'won');
  const lastOpen = all.filter((stage) => stage.kind === 'open').at(-1);
  const sortOrder = lastOpen ? (lastOpen.sortOrder ?? 0) + 1 : (won?.sortOrder ?? 0) - 1;

  const created = await stages().create({
    name,
    kind: 'open',
    probability: clampProbability(input.probability),
    sortOrder,
  });

  // Renumber so there is always room between two stages.
  const ordered = await stages().find().sort({ sortOrder: 1 });
  for (const [index, stage] of ordered.entries()) {
    await stages().updateOne({ _id: stage._id }, { $set: { sortOrder: (index + 1) * 10 } });
  }

  await recordAudit({
    action: 'pipeline.stage_added',
    entityType: 'PipelineStage',
    entityId: created._id,
    after: { name, probability: clampProbability(input.probability) },
  });
}

export async function updateStage(
  id: string,
  input: { name: string; probability: number },
): Promise<void> {
  await connectToDatabase();
  await requirePipelineManage();

  const before = await stages().findById(id);
  if (!before) throw new Error('Stage not found.');

  const name = input.name.trim();
  if (!name) throw new Error('A stage needs a name.');

  if (name !== before.name) {
    const inUse = await opportunities().count({ stageId: before._id });
    if (inUse > 0) {
      throw new Error('Move the opportunities out of this stage before renaming it.');
    }
    if (await nameTaken(name, id)) throw new Error('There is already a stage with that name.');
  }

  await stages().updateOne(
    { _id: before._id },
    { $set: { name, probability: clampProbability(input.probability) } },
  );

  await recordAudit({
    action: 'pipeline.stage_updated',
    entityType: 'PipelineStage',
    entityId: before._id,
    before: { name: before.name, probability: before.probability },
    after: { name, probability: clampProbability(input.probability) },
  });
}

/** Moves an open stage one place; Won and Lost stay at the end, in that order. */
export async function moveStage(id: string, direction: 'up' | 'down'): Promise<void> {
  await connectToDatabase();
  await requirePipelineManage();

  const ordered = await stages().find().sort({ sortOrder: 1 });
  const open = ordered.filter((stage) => stage.kind === 'open');
  const index = open.findIndex((stage) => String(stage._id) === id);
  if (index === -1) throw new Error('Only open stages can be moved.');

  const swapWith = open[direction === 'up' ? index - 1 : index + 1];
  if (!swapWith) return;

  const current = open[index];
  await stages().updateOne({ _id: current._id }, { $set: { sortOrder: swapWith.sortOrder } });
  await stages().updateOne({ _id: swapWith._id }, { $set: { sortOrder: current.sortOrder } });

  await recordAudit({
    action: 'pipeline.stage_moved',
    entityType: 'PipelineStage',
    entityId: current._id,
    after: { direction },
  });
}

/** Won and Lost can never be removed, and no stage can be while a deal sits in it. */
export async function removeStage(id: string): Promise<void> {
  await connectToDatabase();
  await requirePipelineManage();

  const stage = await stages().findById(id);
  if (!stage) throw new Error('Stage not found.');
  if (stage.kind !== 'open') throw new Error('The Won and Lost stages cannot be removed.');
  if ((await opportunities().count({ stageId: stage._id })) > 0) {
    throw new Error('Move the opportunities out of this stage before removing it.');
  }

  await stages().softDelete({ _id: stage._id });

  await recordAudit({
    action: 'pipeline.stage_removed',
    entityType: 'PipelineStage',
    entityId: stage._id,
    before: { name: stage.name },
  });
}

export async function listLostReasons(): Promise<string[]> {
  await connectToDatabase();
  const tenant = await TenantModel.findOne({ _id: getContext().tenantId });
  return tenant?.lostReasons ?? [];
}

export async function saveLostReasons(reasons: string[]): Promise<void> {
  await connectToDatabase();
  await requirePipelineManage();

  const cleaned = [...new Set(reasons.map((reason) => reason.trim()).filter(Boolean))];
  if (cleaned.length === 0) throw new Error('Keep at least one lost reason.');

  const before = await listLostReasons();
  await TenantModel.updateOne({ _id: getContext().tenantId }, { $set: { lostReasons: cleaned } });

  await recordAudit({
    action: 'pipeline.lost_reasons_updated',
    entityType: 'Tenant',
    before: { lostReasons: before },
    after: { lostReasons: cleaned },
  });
}

export async function getStaleDays(): Promise<number> {
  await connectToDatabase();
  const tenant = await TenantModel.findOne({ _id: getContext().tenantId });
  return tenant?.opportunityStaleDays ?? DEFAULT_STALE_DAYS;
}

export async function saveStaleDays(days: number): Promise<void> {
  await connectToDatabase();
  await requirePipelineManage();

  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw new Error('Enter a whole number of days between 1 and 365.');
  }

  const before = await getStaleDays();
  await TenantModel.updateOne(
    { _id: getContext().tenantId },
    { $set: { opportunityStaleDays: days } },
  );

  await recordAudit({
    action: 'pipeline.stale_days_updated',
    entityType: 'Tenant',
    before: { opportunityStaleDays: before },
    after: { opportunityStaleDays: days },
  });
}
