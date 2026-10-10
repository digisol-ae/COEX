import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { getContext } from '@/lib/tenant-context';
import { recordAudit, changedFields } from '@/modules/core/services/audit.service';
import { nextNumber } from '@/modules/core/services/numbering.service';
import { UserModel } from '@coex/shared/core/models/user.model';
import { OPPORTUNITY_STATUSES, OpportunityModel } from '@coex/shared/crm/models/opportunity.model';
import { PipelineStageModel } from '@coex/shared/crm/models/pipeline-stage.model';
import { ContactModel } from '@coex/shared/crm/models/contact.model';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { ProductModel } from '@coex/shared/crm/models/product.model';
import {
  clampProbability,
  lacksNextStep,
  nextStepOverdue,
  statusForStage,
  totalsByCurrency,
  type OpportunityStatus,
  type StageKind,
} from '@coex/shared/crm/opportunity-rules';
import { todayKey } from '@coex/shared/crm/contract-status';
import { actorCan } from './access.service';
import { recordActivity } from './activity.service';
import { listLostReasons, listStages } from './pipeline.service';
import { toMinorUnits } from './product.service';

/**
 * Opportunities: potential sales to customers (Full CRM, P2.2b).
 *
 * Visibility follows the leads rule: a person sees the opportunities they own, and holders of
 * opportunity.read.all (managers and administrators) see every one. The service enforces it, so a
 * screen that forgets to check still cannot leak another salesperson's deals.
 */

const opportunities = () => repository(OpportunityModel);
const stages = () => repository(PipelineStageModel);
const organisations = () => repository(OrganisationModel);
const contactRecords = () => repository(ContactModel);
const products = () => repository(ProductModel);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface OpportunitySummary {
  id: string;
  number: string;
  organisationId: string;
  organisationName: string;
  contactId: string | null;
  contactName: string | null;
  title: string;
  stageId: string;
  stageName: string;
  stageKind: StageKind;
  status: OpportunityStatus;
  ownerId: string;
  ownerName: string;
  oneOffMinorUnits: number;
  recurringMinorUnits: number;
  currency: string;
  expectedCloseDate: string | null;
  probability: number;
  productIds: string[];
  lostReason: string | null;
  closedAt: Date | null;
  nextStep: string | null;
  nextStepDate: string | null;
  quoteReference: string | null;
  notes: string | null;
  createdAt: Date;
}

export interface OpportunityInput {
  organisationId: string;
  contactId?: string;
  title: string;
  stageId?: string;
  /** Defaults to the customer's owner, then to the person saving. */
  ownerId?: string;
  oneOff?: string;
  recurring?: string;
  currency?: string;
  expectedCloseDate?: string;
  /** Left out, the probability is taken from the stage. */
  probability?: number | null;
  productIds?: string[];
  nextStep?: string;
  nextStepDate?: string;
  quoteReference?: string;
  notes?: string;
}

async function requireManage(): Promise<void> {
  if (!(await actorCan('opportunity.manage'))) throw new Error('You may not change opportunities.');
}

async function visible(id: string) {
  const found = await opportunities().findById(id);
  if (!found) return null;

  if (
    !(await actorCan('opportunity.read.all')) &&
    String(found.ownerId) !== String(getContext().userId)
  ) {
    return null;
  }

  return found;
}

/** The customer's timeline shows what is planned next, so a colleague opening the customer sees it. */
async function recordNextStep(deal: {
  _id: Types.ObjectId;
  organisationId: Types.ObjectId;
  contactId?: Types.ObjectId | null;
  number: string;
  nextStep?: string | null;
  nextStepDate?: string | null;
}): Promise<void> {
  await recordActivity({
    organisationId: deal.organisationId,
    contactId: deal.contactId,
    kind: 'next_step_set',
    summary: `Next step on ${deal.number}: ${deal.nextStep}${deal.nextStepDate ? ` (${deal.nextStepDate})` : ''}`,
    sourceId: deal._id,
  });
}

async function prepare(input: OpportunityInput) {
  const title = input.title.trim();
  if (!title) throw new Error('An opportunity needs a title.');

  const organisation = await organisations().findById(input.organisationId);
  if (!organisation) throw new Error('That customer was not found.');

  if (input.contactId) {
    const contact = await contactRecords().findOne({
      _id: input.contactId,
      organisationId: input.organisationId,
      status: 'active',
    });
    if (!contact) throw new Error('The contact must be an active contact of this customer.');
  }

  for (const date of [input.expectedCloseDate, input.nextStepDate]) {
    if (date && !DATE_PATTERN.test(date)) throw new Error('Dates must be real calendar days.');
  }

  const wantedProducts = [...new Set(input.productIds ?? [])];
  const foundProducts = wantedProducts.length
    ? await products().find({ _id: { $in: wantedProducts } })
    : [];
  if (foundProducts.length !== wantedProducts.length) {
    throw new Error('One of the products was not found.');
  }

  const ownerId = input.ownerId || String(organisation.ownerId ?? getContext().userId);
  const owner = await UserModel.findOne({
    _id: ownerId,
    tenantId: getContext().tenantId,
    status: 'active',
  });
  if (!owner) throw new Error('The owner must be an active member of the team.');

  return {
    title,
    organisationId: organisation._id,
    contactId: input.contactId ? new Types.ObjectId(input.contactId) : null,
    ownerId: owner._id,
    oneOffMinorUnits: toMinorUnits(input.oneOff) ?? 0,
    recurringMinorUnits: toMinorUnits(input.recurring) ?? 0,
    currency: (input.currency || 'AED').toUpperCase(),
    expectedCloseDate: input.expectedCloseDate || null,
    productIds: foundProducts.map((product) => product._id),
    nextStep: input.nextStep?.trim() || null,
    nextStepDate: input.nextStepDate || null,
    quoteReference: input.quoteReference?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

export async function createOpportunity(input: OpportunityInput): Promise<string> {
  await connectToDatabase();
  await requireManage();

  const fields = await prepare(input);

  const allStages = await listStages();
  const stage = input.stageId
    ? allStages.find((candidate) => candidate.id === input.stageId)
    : allStages.find((candidate) => candidate.kind === 'open');
  if (!stage) throw new Error('Choose a pipeline stage.');
  // A deal is born open; it is won or lost by moving it, which asks for the reason.
  if (stage.kind !== 'open') throw new Error('A new opportunity starts in an open stage.');

  const created = await opportunities().create({
    ...fields,
    number: await nextNumber('opportunity'),
    stageId: new Types.ObjectId(stage.id),
    status: 'open',
    probability: clampProbability(input.probability ?? stage.probability),
    lastActivityAt: new Date(),
  });

  await recordAudit({
    action: 'opportunity.created',
    entityType: 'Opportunity',
    entityId: created._id,
    after: { number: created.number, title: created.title, stage: stage.name },
  });
  await recordActivity({
    organisationId: created.organisationId,
    contactId: created.contactId,
    kind: 'stage_changed',
    summary: `Opportunity ${created.number} "${created.title}" opened in ${stage.name}`,
    sourceId: created._id,
  });
  if (created.nextStep) await recordNextStep(created);

  return String(created._id);
}

export async function updateOpportunity(id: string, input: OpportunityInput): Promise<void> {
  await connectToDatabase();
  await requireManage();

  const before = await visible(id);
  if (!before) throw new Error('Opportunity not found.');
  if (before.status !== 'open') {
    throw new Error('A won or lost opportunity cannot be edited. A manager can reopen it.');
  }

  const fields = await prepare(input);
  const after = await opportunities().updateOne(
    { _id: before._id },
    {
      $set: {
        ...fields,
        lastActivityAt: new Date(),
        ...(input.probability === null || input.probability === undefined
          ? {}
          : { probability: clampProbability(input.probability) }),
      },
    },
  );

  if (
    after &&
    (before.nextStep !== after.nextStep || before.nextStepDate !== after.nextStepDate) &&
    after.nextStep
  ) {
    await recordNextStep(after);
  }

  await recordAudit({
    action: 'opportunity.updated',
    entityType: 'Opportunity',
    entityId: before._id,
    ...changedFields(
      {
        title: before.title,
        owner: String(before.ownerId),
        oneOff: before.oneOffMinorUnits,
        recurring: before.recurringMinorUnits,
        currency: before.currency,
        expectedCloseDate: before.expectedCloseDate,
        probability: before.probability,
        nextStep: before.nextStep,
        nextStepDate: before.nextStepDate,
      },
      {
        title: after?.title,
        owner: String(after?.ownerId),
        oneOff: after?.oneOffMinorUnits,
        recurring: after?.recurringMinorUnits,
        currency: after?.currency,
        expectedCloseDate: after?.expectedCloseDate,
        probability: after?.probability,
        nextStep: after?.nextStep,
        nextStepDate: after?.nextStepDate,
      },
    ),
  });
}

/**
 * Moves a deal to a stage. Reaching Lost needs a reason from the tenant's list; winning turns a
 * prospect into a client; leaving Won or Lost is a reopening, which needs pipeline.manage and a
 * written reason and is audited (spec, Rules).
 */
export async function moveOpportunity(
  id: string,
  stageId: string,
  options: { lostReason?: string; reopenReason?: string } = {},
): Promise<void> {
  await connectToDatabase();
  await requireManage();

  const before = await visible(id);
  if (!before) throw new Error('Opportunity not found.');

  const stage = await stages().findById(stageId);
  if (!stage) throw new Error('That stage was not found.');
  const previous = await stages().findById(before.stageId, { withDeleted: true });
  if (String(before.stageId) === stageId) return;

  const reopening = before.status !== 'open';
  if (reopening) {
    if (!(await actorCan('pipeline.manage'))) {
      throw new Error('Only a manager can reopen a won or lost opportunity.');
    }
    if (!options.reopenReason?.trim()) throw new Error('Say why this opportunity is reopened.');
  }

  const kind = stage.kind as StageKind;
  let lostReason: string | null = null;

  if (kind === 'lost') {
    lostReason = options.lostReason?.trim() || null;
    if (!lostReason) throw new Error('Choose why the opportunity was lost.');
    if (!(await listLostReasons()).includes(lostReason)) {
      throw new Error('Choose one of the listed lost reasons.');
    }
  }

  const status = statusForStage(kind);

  await opportunities().updateOne(
    { _id: before._id },
    {
      $set: {
        stageId: stage._id,
        status,
        lostReason,
        closedAt: status === 'open' ? null : new Date(),
        lastActivityAt: new Date(),
        // Taken from the stage, so Won reads 100% and Lost 0%; an open deal keeps what was set by hand
        // only while it stays in the same stage, which a move by definition does not.
        probability: stage.probability ?? 0,
      },
    },
  );

  // Winning turns a prospect into a client: they have now bought something.
  if (status === 'won') {
    await organisations().updateOne(
      { _id: before.organisationId, kind: 'prospect' },
      { $set: { kind: 'client' } },
    );
  }

  await recordAudit({
    action: reopening ? 'opportunity.reopened' : 'opportunity.stage_changed',
    entityType: 'Opportunity',
    entityId: before._id,
    before: { stage: previous?.name, status: before.status },
    after: {
      stage: stage.name,
      status,
      ...(lostReason ? { lostReason } : {}),
      ...(reopening ? { reason: options.reopenReason?.trim() } : {}),
    },
  });
  await recordActivity({
    organisationId: before.organisationId,
    contactId: before.contactId,
    kind: 'stage_changed',
    summary: `Opportunity ${before.number} moved from ${previous?.name ?? 'a stage'} to ${stage.name}`,
    body: lostReason ? `Lost: ${lostReason}` : null,
    sourceId: before._id,
  });
}

/** Nothing deletes: an archived opportunity leaves the lists but stays in the history. */
export async function archiveOpportunity(id: string): Promise<void> {
  await connectToDatabase();
  await requireManage();

  const found = await visible(id);
  if (!found) throw new Error('Opportunity not found.');

  await opportunities().updateOne({ _id: found._id }, { $set: { deletedAt: new Date() } });
  await recordAudit({
    action: 'opportunity.archived',
    entityType: 'Opportunity',
    entityId: found._id,
  });
}

export interface OpportunityFilter {
  status?: OpportunityStatus;
  stageId?: string;
  ownerId?: string;
  organisationId?: string;
  search?: string;
  id?: string;
}

function escapePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function listOpportunities(
  filter: OpportunityFilter = {},
): Promise<OpportunitySummary[]> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};

  if (!(await actorCan('opportunity.read.all'))) {
    query.ownerId = new Types.ObjectId(String(getContext().userId));
  } else if (filter.ownerId) {
    query.ownerId = new Types.ObjectId(filter.ownerId);
  }

  if (filter.status && (OPPORTUNITY_STATUSES as readonly string[]).includes(filter.status)) {
    query.status = filter.status;
  }
  if (filter.stageId) query.stageId = new Types.ObjectId(filter.stageId);
  if (filter.organisationId) query.organisationId = new Types.ObjectId(filter.organisationId);
  if (filter.id) query._id = new Types.ObjectId(filter.id);

  if (filter.search?.trim()) {
    const pattern = { $regex: escapePattern(filter.search.trim()), $options: 'i' };
    query.$or = [{ title: pattern }, { number: pattern }];
  }

  const found = await opportunities().find(query).sort({ createdAt: -1 });

  const [stageList, owners, customerRows, contactRows] = await Promise.all([
    listStages(),
    UserModel.find({
      _id: { $in: [...new Set(found.map((item) => String(item.ownerId)))] },
      tenantId: getContext().tenantId,
    }),
    organisations().find({
      _id: { $in: [...new Set(found.map((item) => String(item.organisationId)))] },
    }),
    contactRecords().find({
      _id: { $in: found.filter((item) => item.contactId).map((item) => item.contactId) },
    }),
  ]);

  const stageById = new Map(stageList.map((stage) => [stage.id, stage]));
  const ownerName = new Map(owners.map((owner) => [String(owner._id), owner.name]));
  const customerName = new Map(customerRows.map((row) => [String(row._id), row.name]));
  const contactName = new Map(contactRows.map((row) => [String(row._id), row.name]));

  return found.map((item) => {
    const stage = stageById.get(String(item.stageId));

    return {
      id: String(item._id),
      number: item.number,
      organisationId: String(item.organisationId),
      organisationName: customerName.get(String(item.organisationId)) ?? 'Unknown customer',
      contactId: item.contactId ? String(item.contactId) : null,
      contactName: item.contactId ? (contactName.get(String(item.contactId)) ?? null) : null,
      title: item.title,
      stageId: String(item.stageId),
      stageName: stage?.name ?? 'Unknown stage',
      stageKind: stage?.kind ?? 'open',
      status: item.status as OpportunityStatus,
      ownerId: String(item.ownerId),
      ownerName: ownerName.get(String(item.ownerId)) ?? 'Unknown',
      oneOffMinorUnits: item.oneOffMinorUnits ?? 0,
      recurringMinorUnits: item.recurringMinorUnits ?? 0,
      currency: item.currency ?? 'AED',
      expectedCloseDate: item.expectedCloseDate ?? null,
      probability: item.probability ?? 0,
      productIds: (item.productIds ?? []).map(String),
      lostReason: item.lostReason ?? null,
      closedAt: item.closedAt ?? null,
      nextStep: item.nextStep ?? null,
      nextStepDate: item.nextStepDate ?? null,
      quoteReference: item.quoteReference ?? null,
      notes: item.notes ?? null,
      createdAt: item.createdAt,
    };
  });
}

export async function getOpportunity(id: string): Promise<OpportunitySummary | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  return (await listOpportunities({ id }))[0] ?? null;
}

export interface OpportunitySnapshot {
  byStage: { stageId: string; stageName: string; count: number }[];
  openCount: number;
  withoutNextStep: number;
  overdueNextStep: number;
  totals: ReturnType<typeof totalsByCurrency>;
}

/**
 * My open opportunities by stage, and how many need attention: no next step, or one past its date.
 * Always the signed-in person's own deals, even for a manager who can see them all, because the
 * dashboard answers "what do I have to do".
 */
export async function loadOpportunitySnapshot(): Promise<OpportunitySnapshot> {
  const mine = await listOpportunities({ status: 'open', ownerId: String(getContext().userId) });
  const today = todayKey();
  const stageList = (await listStages()).filter((stage) => stage.kind === 'open');

  return {
    byStage: stageList.map((stage) => ({
      stageId: stage.id,
      stageName: stage.name,
      count: mine.filter((deal) => deal.stageId === stage.id).length,
    })),
    openCount: mine.length,
    withoutNextStep: mine.filter((deal) => lacksNextStep(deal)).length,
    overdueNextStep: mine.filter((deal) => nextStepOverdue(deal, today)).length,
    totals: totalsByCurrency(mine),
  };
}
