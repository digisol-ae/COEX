import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { recordAudit, changedFields } from '@/modules/core/services/audit.service';
import { nextNumber } from '@/modules/core/services/numbering.service';
import { BILLING_FREQUENCIES, CONTRACT_TYPES, ContractModel } from '../models/contract.model';
import { OrganisationModel } from '../models/organisation.model';
import { ProductModel } from '../models/product.model';
import {
  DEFAULT_EXPIRY_WARNING_DAYS,
  deriveContractStatus,
  todayKey,
  type ContractStatus,
  type StoredContractStatus,
} from '../contract-status';
import { toMinorUnits } from './product.service';

/**
 * Contracts and annual maintenance agreements.
 *
 * Lives in the CRM module because it is customer commercial data that reads organisations and
 * products directly; a separate module would have to import both siblings, which only Tasks and
 * Tickets may do (decision 13). Billing stays in Zoho Books: nothing here issues an invoice.
 */

const contracts = () => repository(ContractModel);
const organisations = () => repository(OrganisationModel);
const products = () => repository(ProductModel);

export type ContractType = (typeof CONTRACT_TYPES)[number];
export type BillingFrequency = (typeof BILLING_FREQUENCIES)[number];

export interface ContractSummary {
  id: string;
  number: string;
  organisationId: string;
  organisationName: string;
  title: string;
  type: ContractType;
  storedStatus: StoredContractStatus;
  status: ContractStatus;
  startDate: string;
  endDate: string;
  billingFrequency: BillingFrequency;
  valueMinorUnits: number;
  currency: string;
  productIds: string[];
  documentUrl: string | null;
  zohoReference: string | null;
  supportHoursEnabled: boolean;
  includedHoursPerPeriod: number | null;
  renewedFromId: string | null;
  notes: string | null;
}

export interface ContractInput {
  organisationId: string;
  title: string;
  type: ContractType;
  startDate: string;
  endDate: string;
  billingFrequency: BillingFrequency;
  value?: string;
  currency?: string;
  productIds?: string[];
  documentUrl?: string;
  zohoReference?: string;
  supportHoursEnabled?: boolean;
  includedHoursPerPeriod?: number | null;
  notes?: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function oneYearAfter(startDate: string): string {
  const end = new Date(`${startDate}T00:00:00Z`);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
}

/** An AMC runs a year unless told otherwise, so the form can suggest the end date. */
export function suggestedEndDate(startDate: string): string {
  return DATE_PATTERN.test(startDate) ? oneYearAfter(startDate) : '';
}

async function validate(input: ContractInput): Promise<Types.ObjectId[]> {
  if (!input.title.trim()) throw new Error('A contract needs a title.');
  if (!DATE_PATTERN.test(input.startDate) || !DATE_PATTERN.test(input.endDate)) {
    throw new Error('Start and end dates are required.');
  }
  if (input.endDate < input.startDate) throw new Error('The end date is before the start date.');
  if (!(CONTRACT_TYPES as readonly string[]).includes(input.type)) {
    throw new Error('Choose a contract type.');
  }
  if (!(BILLING_FREQUENCIES as readonly string[]).includes(input.billingFrequency)) {
    throw new Error('Choose how often the contract is billed.');
  }
  if (input.documentUrl && !/^https:\/\//i.test(input.documentUrl.trim())) {
    throw new Error('The document link must start with https://.');
  }
  if (
    input.supportHoursEnabled &&
    (input.includedHoursPerPeriod === null ||
      input.includedHoursPerPeriod === undefined ||
      input.includedHoursPerPeriod < 0)
  ) {
    throw new Error('Enter the support hours included in each billing period.');
  }

  if (!(await organisations().findById(input.organisationId))) {
    throw new Error('That customer was not found.');
  }

  const wanted = [...new Set(input.productIds ?? [])];
  const found = wanted.length ? await products().find({ _id: { $in: wanted } }) : [];
  if (found.length !== wanted.length) throw new Error('One of the products was not found.');

  return found.map((product) => product._id);
}

function fields(input: ContractInput, productIds: Types.ObjectId[]) {
  return {
    organisationId: new Types.ObjectId(input.organisationId),
    title: input.title.trim(),
    type: input.type,
    startDate: input.startDate,
    endDate: input.endDate,
    billingFrequency: input.billingFrequency,
    valueMinorUnits: toMinorUnits(input.value) ?? 0,
    currency: (input.currency || 'AED').toUpperCase(),
    productIds,
    documentUrl: input.documentUrl?.trim() || null,
    zohoReference: input.zohoReference?.trim() || null,
    supportHoursEnabled: Boolean(input.supportHoursEnabled),
    includedHoursPerPeriod: input.supportHoursEnabled ? (input.includedHoursPerPeriod ?? 0) : null,
    notes: input.notes?.trim() || null,
  };
}

export async function createContract(input: ContractInput): Promise<string> {
  await connectToDatabase();

  const productIds = await validate(input);
  const created = await contracts().create({
    ...fields(input, productIds),
    number: await nextNumber('contract'),
    status: 'draft',
  });

  await recordAudit({
    action: 'contract.created',
    entityType: 'Contract',
    entityId: created._id,
    after: { number: created.number, title: created.title, endDate: created.endDate },
  });

  return String(created._id);
}

export async function updateContract(id: string, input: ContractInput): Promise<void> {
  await connectToDatabase();

  const before = await contracts().findById(id);
  if (!before) throw new Error('Contract not found.');

  const productIds = await validate(input);
  const after = await contracts().updateOne(
    { _id: before._id },
    { $set: fields(input, productIds) },
  );

  await recordAudit({
    action: 'contract.updated',
    entityType: 'Contract',
    entityId: before._id,
    ...changedFields(
      {
        title: before.title,
        startDate: before.startDate,
        endDate: before.endDate,
        value: before.valueMinorUnits,
        currency: before.currency,
        billingFrequency: before.billingFrequency,
      },
      {
        title: after?.title,
        startDate: after?.startDate,
        endDate: after?.endDate,
        value: after?.valueMinorUnits,
        currency: after?.currency,
        billingFrequency: after?.billingFrequency,
      },
    ),
  });
}

/** Moves between the states a person decides. Expiring and expired are never set by hand. */
export async function setContractStatus(
  id: string,
  status: Exclude<StoredContractStatus, 'renewed'>,
): Promise<void> {
  await connectToDatabase();

  const before = await contracts().findById(id);
  if (!before) throw new Error('Contract not found.');
  if (before.status === 'renewed') throw new Error('A renewed contract cannot change status.');

  await contracts().updateOne({ _id: before._id }, { $set: { status } });

  await recordAudit({
    action: `contract.${status}`,
    entityType: 'Contract',
    entityId: before._id,
    before: { status: before.status },
    after: { status },
  });
}

/** Nothing deletes: an archived contract leaves the list but its history stays. */
export async function archiveContract(id: string): Promise<void> {
  await connectToDatabase();

  const contract = await contracts().updateOne({ _id: id }, { $set: { deletedAt: new Date() } });
  if (!contract) throw new Error('Contract not found.');

  await recordAudit({
    action: 'contract.archived',
    entityType: 'Contract',
    entityId: contract._id,
  });
}

export async function listContracts(filter?: {
  organisationId?: string;
}): Promise<ContractSummary[]> {
  await connectToDatabase();

  const found = await contracts()
    .find(filter?.organisationId ? { organisationId: filter.organisationId } : {})
    .sort({ endDate: 1, number: 1 });

  const organisationIds = [...new Set(found.map((contract) => String(contract.organisationId)))];
  const owners = organisationIds.length
    ? await organisations().find({ _id: { $in: organisationIds } })
    : [];
  const byId = new Map(owners.map((organisation) => [String(organisation._id), organisation]));

  const today = todayKey();

  return found.map((contract) => {
    const organisation = byId.get(String(contract.organisationId));

    return {
      id: String(contract._id),
      number: contract.number,
      organisationId: String(contract.organisationId),
      organisationName: organisation?.name ?? 'Unknown customer',
      title: contract.title,
      type: contract.type as ContractType,
      storedStatus: contract.status as StoredContractStatus,
      status: deriveContractStatus(
        { status: contract.status as StoredContractStatus, endDate: contract.endDate },
        today,
        organisation?.expiryWarningDays ?? DEFAULT_EXPIRY_WARNING_DAYS,
      ),
      startDate: contract.startDate,
      endDate: contract.endDate,
      billingFrequency: contract.billingFrequency as BillingFrequency,
      valueMinorUnits: contract.valueMinorUnits ?? 0,
      currency: contract.currency ?? 'AED',
      productIds: (contract.productIds ?? []).map(String),
      documentUrl: contract.documentUrl ?? null,
      zohoReference: contract.zohoReference ?? null,
      supportHoursEnabled: Boolean(contract.supportHoursEnabled),
      includedHoursPerPeriod: contract.includedHoursPerPeriod ?? null,
      renewedFromId: contract.renewedFromId ? String(contract.renewedFromId) : null,
      notes: contract.notes ?? null,
    };
  });
}
