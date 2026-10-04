import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { getContext } from '@/lib/tenant-context';
import { recordAudit, changedFields } from '@/modules/core/services/audit.service';
import {
  getContractTemplates,
  queueEmail,
  type ContractTemplateKey,
  type ContractTemplates,
} from '@/modules/core/services/email.service';
import { TenantModel } from '@/modules/core/models/tenant.model';
import { recordActivity } from './activity.service';
import { nextNumber } from '@/modules/core/services/numbering.service';
import { BILLING_FREQUENCIES, CONTRACT_TYPES, ContractModel } from '../models/contract.model';
import { ContactModel } from '../models/contact.model';
import { OrganisationModel } from '../models/organisation.model';
import { ProductModel } from '../models/product.model';
import {
  DEFAULT_EXPIRY_WARNING_DAYS,
  daysBetween,
  deriveContractStatus,
  contractExpiryNotice,
  renewalTerm,
  todayKey,
  type ContractStatus,
  type StoredContractStatus,
} from '../contract-status';
import { toMinorUnits } from './product.service';
import {
  defaultContractTemplate,
  fillContractTemplate,
  type ContractEmailValues,
} from '../contract-email';

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
const contactRecords = () => repository(ContactModel);

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
  /** Whole days until the end date, for a contract in force; null otherwise. */
  daysLeft: number | null;
  startDate: string;
  endDate: string;
  billingFrequency: BillingFrequency;
  valueMinorUnits: number;
  currency: string;
  productIds: string[];
  contactIds: string[];
  lastEmailedAt: string | null;
  documentUrl: string | null;
  zohoReference: string | null;
  supportHoursEnabled: boolean;
  includedHoursPerPeriod: number | null;
  renewedFromId: string | null;
  invoicedPeriods: number[];
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
  contactIds?: string[];
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

async function validate(
  input: ContractInput,
): Promise<{ productIds: Types.ObjectId[]; contactIds: Types.ObjectId[] }> {
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

  const wantedContacts = [...new Set(input.contactIds ?? [])];
  const foundContacts = wantedContacts.length
    ? await contactRecords().find({
        _id: { $in: wantedContacts },
        organisationId: input.organisationId,
        status: 'active',
      })
    : [];
  if (foundContacts.length !== wantedContacts.length) {
    throw new Error("Contract contacts must be active contacts of this contract's customer.");
  }

  return {
    productIds: found.map((product) => product._id),
    contactIds: foundContacts.map((contact) => contact._id),
  };
}

function fields(
  input: ContractInput,
  linked: { productIds: Types.ObjectId[]; contactIds: Types.ObjectId[] },
) {
  return {
    organisationId: new Types.ObjectId(input.organisationId),
    title: input.title.trim(),
    type: input.type,
    startDate: input.startDate,
    endDate: input.endDate,
    billingFrequency: input.billingFrequency,
    valueMinorUnits: toMinorUnits(input.value) ?? 0,
    currency: (input.currency || 'AED').toUpperCase(),
    productIds: linked.productIds,
    contactIds: linked.contactIds,
    documentUrl: input.documentUrl?.trim() || null,
    zohoReference: input.zohoReference?.trim() || null,
    supportHoursEnabled: Boolean(input.supportHoursEnabled),
    includedHoursPerPeriod: input.supportHoursEnabled ? (input.includedHoursPerPeriod ?? 0) : null,
    notes: input.notes?.trim() || null,
  };
}

export async function createContract(input: ContractInput): Promise<string> {
  await connectToDatabase();

  const linked = await validate(input);
  const created = await contracts().create({
    ...fields(input, linked),
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

  const linked = await validate(input);
  const after = await contracts().updateOne({ _id: before._id }, { $set: fields(input, linked) });

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

  // Putting a renewal in force is what retires the contract it replaces, so the old one stops
  // warning and the list shows a single live contract for the term.
  if (status === 'active' && before.renewedFromId) {
    await contracts().updateOne(
      { _id: before.renewedFromId, status: 'active' },
      { $set: { status: 'renewed' } },
    );
  }

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
  id?: string;
}): Promise<ContractSummary[]> {
  await connectToDatabase();

  const found = await contracts()
    .find({
      ...(filter?.organisationId ? { organisationId: filter.organisationId } : {}),
      ...(filter?.id ? { _id: filter.id } : {}),
    })
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
      daysLeft: contract.status === 'active' ? daysBetween(today, contract.endDate) : null,
      startDate: contract.startDate,
      endDate: contract.endDate,
      billingFrequency: contract.billingFrequency as BillingFrequency,
      valueMinorUnits: contract.valueMinorUnits ?? 0,
      currency: contract.currency ?? 'AED',
      productIds: (contract.productIds ?? []).map(String),
      contactIds: (contract.contactIds ?? []).map(String),
      lastEmailedAt: contract.lastEmailedAt ? contract.lastEmailedAt.toISOString() : null,
      documentUrl: contract.documentUrl ?? null,
      zohoReference: contract.zohoReference ?? null,
      supportHoursEnabled: Boolean(contract.supportHoursEnabled),
      includedHoursPerPeriod: contract.includedHoursPerPeriod ?? null,
      renewedFromId: contract.renewedFromId ? String(contract.renewedFromId) : null,
      invoicedPeriods: contract.invoicedPeriods ?? [],
      notes: contract.notes ?? null,
    };
  });
}

/**
 * Renews a contract: a new draft for the next term, pointing back at the old one. The old contract
 * stays as it was until the renewal is activated, so abandoning a draft loses nothing.
 */
export async function renewContract(id: string): Promise<string> {
  await connectToDatabase();

  const old = await contracts().findById(id);
  if (!old) throw new Error('Contract not found.');
  if (old.status !== 'active') throw new Error('Only an active contract can be renewed.');

  if (await contracts().findOne({ renewedFromId: old._id })) {
    throw new Error('This contract has already been renewed.');
  }

  const term = renewalTerm(old.startDate, old.endDate);
  const created = await contracts().create({
    organisationId: old.organisationId,
    title: old.title,
    type: old.type,
    startDate: term.startDate,
    endDate: term.endDate,
    billingFrequency: old.billingFrequency,
    valueMinorUnits: old.valueMinorUnits,
    currency: old.currency,
    productIds: old.productIds,
    documentUrl: null,
    zohoReference: old.zohoReference,
    supportHoursEnabled: old.supportHoursEnabled,
    includedHoursPerPeriod: old.includedHoursPerPeriod,
    renewalReminderDays: old.renewalReminderDays,
    renewedFromId: old._id,
    number: await nextNumber('contract'),
    status: 'draft',
  });

  await recordAudit({
    action: 'contract.renewed',
    entityType: 'Contract',
    entityId: old._id,
    after: { renewalId: String(created._id), number: created.number, ...term },
  });

  return String(created._id);
}

/** Active contracts that have reached their warning window or passed their end date. */
export async function listRenewalsDue(): Promise<ContractSummary[]> {
  const all = await listContracts();
  return all.filter((contract) => contract.status === 'expiring' || contract.status === 'expired');
}

export async function getContract(id: string): Promise<ContractSummary | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  return (await listContracts({ id }))[0] ?? null;
}

/** The manual "invoiced in Zoho Books" tick, until the read only Zoho link replaces it. */
export async function setPeriodInvoiced(
  id: string,
  periodIndex: number,
  invoiced: boolean,
): Promise<void> {
  await connectToDatabase();

  if (!Number.isInteger(periodIndex) || periodIndex < 0) throw new Error('Unknown billing period.');

  const updated = await contracts().updateOne(
    { _id: id },
    invoiced
      ? { $addToSet: { invoicedPeriods: periodIndex } }
      : { $pull: { invoicedPeriods: periodIndex } },
  );
  if (!updated) throw new Error('Contract not found.');

  await recordAudit({
    action: invoiced ? 'contract.period_invoiced' : 'contract.period_uninvoiced',
    entityType: 'Contract',
    entityId: updated._id,
    after: { periodIndex },
  });
}

export interface ContractNotice {
  state: 'expiring' | 'expired' | 'none';
  contractNumber: string | null;
  endDate: string | null;
  /** Ready to put in front of the customer, or null when there is nothing to warn about. */
  customerText: string | null;
}

/**
 * What a ticket for this customer should say about its contract.
 *
 * Only customers (not prospects or suppliers) are expected to hold a contract. A contract that is
 * in force and not near its end says nothing. "None" is for agents only: the customer is never
 * told they have no contract, because that is a conversation for a person, not a template.
 */
export async function contractNoticeFor(
  organisationId: string | Types.ObjectId | null | undefined,
): Promise<ContractNotice | null> {
  if (!organisationId) return null;
  await connectToDatabase();

  const organisation = await organisations().findById(String(organisationId));
  if (!organisation || organisation.kind !== 'client') return null;

  const inForce = (await listContracts({ organisationId: String(organisationId) })).filter(
    (contract) => contract.storedStatus === 'active',
  );

  if (inForce.length === 0) {
    return { state: 'none', contractNumber: null, endDate: null, customerText: null };
  }

  // Any contract that is comfortably in force means the customer is covered.
  if (inForce.some((contract) => contract.status === 'active')) return null;

  const latest = [...inForce].sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
  const state = latest.status === 'expired' ? 'expired' : 'expiring';

  return {
    state,
    contractNumber: latest.number,
    endDate: latest.endDate,
    customerText: contractExpiryNotice({
      status: state,
      contractNumber: latest.number,
      endDate: latest.endDate,
    }),
  };
}

/**
 * The number on the menu badge: active contracts inside their warning window, or past their end
 * date. The same set as the Renewals due list, so the badge and the page it opens always agree.
 */
export async function countContractsNeedingRenewal(): Promise<number> {
  return (await listRenewalsDue()).length;
}

/* ------------------------------------------------------------------------------------------------
 * Emailing a contract's contacts.
 * ---------------------------------------------------------------------------------------------- */

const BILLING_LABEL: Record<BillingFrequency, string> = {
  monthly: 'Monthly',
  bimonthly: 'Every two months',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

function formatAmount(minorUnits: number, currency: string): string {
  return `${currency} ${(minorUnits / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function emailValues(
  contract: ContractSummary,
  contactName: string,
): Promise<ContractEmailValues> {
  const tenant = await TenantModel.findOne({ _id: getContext().tenantId }).select('name');

  return {
    contact: contactName,
    customer: contract.organisationName,
    contract_title: contract.title,
    contract_number: contract.number,
    start_date: contract.startDate,
    end_date: contract.endDate,
    // The days left only mean something while the contract runs; after the end it reads as 0.
    days_left: String(Math.max(0, daysBetween(todayKey(), contract.endDate))),
    amount: formatAmount(contract.valueMinorUnits, contract.currency),
    billing: BILLING_LABEL[contract.billingFrequency],
    company: tenant?.name ?? '',
  };
}

export interface ContractEmailRecipient {
  id: string;
  name: string;
  email: string | null;
}

export interface ContractEmailDraft {
  recipients: ContractEmailRecipient[];
  templates: ContractTemplates;
  defaultTemplate: ContractTemplateKey;
  /** Placeholder values for the first recipient who has an address, for the preview. */
  sampleValues: ContractEmailValues;
  previewName: string;
}

async function recipientsOf(contract: ContractSummary): Promise<ContractEmailRecipient[]> {
  if (contract.contactIds.length === 0) return [];

  const found = await contactRecords().find({
    _id: { $in: contract.contactIds },
    organisationId: contract.organisationId,
  });

  return found
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((contact) => ({
      id: String(contact._id),
      name: contact.name,
      email: contact.email ?? null,
    }));
}

/** What the send popup needs: who will be emailed, the three templates and a preview's values. */
export async function prepareContractEmail(id: string): Promise<ContractEmailDraft> {
  await connectToDatabase();

  const contract = await getContract(id);
  if (!contract) throw new Error('Contract not found.');

  const recipients = await recipientsOf(contract);

  // The preview is written for someone who will actually receive the email.
  const previewName =
    (recipients.find((person) => person.email) ?? recipients[0])?.name ?? 'Customer contact';

  return {
    recipients,
    templates: await getContractTemplates(),
    defaultTemplate: defaultContractTemplate(contract.status),
    sampleValues: await emailValues(contract, previewName),
    previewName,
  };
}

/**
 * Emails each contact chosen on the contract, one message each so every greeting is personal and no
 * address is shown to the others. The subject and body are templates: the person may have edited
 * the words, and the placeholders are filled here for each recipient.
 */
export async function sendContractEmail(
  id: string,
  input: { subject: string; body: string },
): Promise<{ queued: number; skipped: string[] }> {
  await connectToDatabase();

  if (!input.subject.trim() || !input.body.trim()) {
    throw new Error('The email needs a subject and a message.');
  }

  const contract = await getContract(id);
  if (!contract) throw new Error('Contract not found.');

  const recipients = await recipientsOf(contract);
  if (recipients.length === 0) {
    throw new Error('Choose who to email: edit the contract and add contract contacts.');
  }

  const skipped: string[] = [];
  let queued = 0;

  for (const recipient of recipients) {
    if (!recipient.email) {
      skipped.push(recipient.name);
      continue;
    }

    const values = await emailValues(contract, recipient.name);
    const subject = fillContractTemplate(input.subject, values).trim();

    const accepted = await queueEmail({
      kind: 'contract_email',
      to: recipient.email,
      subject,
      text: fillContractTemplate(input.body, values).trim(),
    });
    if (!accepted) continue;

    queued += 1;
    await recordActivity({
      organisationId: contract.organisationId,
      contactId: recipient.id,
      kind: 'email',
      direction: 'outbound',
      summary: `Contract email sent: ${subject}`,
      sourceModule: 'crm',
      sourceId: contract.id,
    });
  }

  if (queued === 0) {
    throw new Error(
      skipped.length
        ? 'None of the contract contacts has an email address.'
        : 'Sending email is turned off in Setup, Email.',
    );
  }

  await contracts().updateOne({ _id: id }, { $set: { lastEmailedAt: new Date() } });
  await recordAudit({
    action: 'contract.emailed',
    entityType: 'Contract',
    entityId: new Types.ObjectId(id),
    after: { recipients: queued, subject: input.subject.trim() },
  });

  return { queued, skipped };
}
