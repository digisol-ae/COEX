import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { getContext } from '@/lib/tenant-context';
import { recordAudit, changedFields } from '@/modules/core/services/audit.service';
import { nextNumber } from '@/modules/core/services/numbering.service';
import { permissionsFor, type Permission, type Role } from '@/modules/core/permissions';
import { TenantModel } from '@/modules/core/models/tenant.model';
import { UserModel } from '@/modules/core/models/user.model';
import { LEAD_STATUSES, LeadModel } from '../models/lead.model';
import { ContactModel } from '../models/contact.model';
import { OrganisationModel } from '../models/organisation.model';
import {
  duplicateReasons,
  isOpenLead,
  normaliseCompany,
  type DuplicateReason,
  type LeadStatus,
} from '../lead-rules';
import { normaliseMobile } from '../phone';

/**
 * Leads: possible customers before they are qualified (Full CRM, P2.2a).
 *
 * Visibility follows John's rule for salespeople: a person sees the leads they own, and managers
 * and administrators (lead.read.all) see every lead. The service enforces it itself, so a screen
 * that forgets to check still cannot leak another salesperson's leads.
 */

const leads = () => repository(LeadModel);
const organisations = () => repository(OrganisationModel);
const contactRecords = () => repository(ContactModel);

export interface LeadSummary {
  id: string;
  number: string;
  name: string;
  company: string | null;
  email: string | null;
  mobile: string | null;
  source: string | null;
  ownerId: string;
  ownerName: string;
  status: LeadStatus;
  disqualifiedReason: string | null;
  notes: string | null;
  customFields: Record<string, unknown>;
  createdAt: Date;
}

export interface LeadInput {
  name: string;
  company?: string;
  email?: string;
  mobile?: string;
  mobileCountry?: string;
  source?: string;
  /** Defaults to the person saving. Changing it needs lead.manage like everything else here. */
  ownerId?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
}

export interface LeadDuplicate {
  kind: 'lead' | 'customer' | 'contact';
  id: string;
  label: string;
  reasons: DuplicateReason[];
}

/** Thrown when a new lead looks like someone already known; the person may save it anyway. */
export class DuplicateLeadError extends Error {
  constructor(public readonly duplicates: LeadDuplicate[]) {
    super('This looks like someone already in COEX.');
  }
}

/** Read from the account rather than taken from the caller, as the Tasks module does. */
async function actorCan(permission: Permission): Promise<boolean> {
  const context = getContext();
  if (context.isPlatformAdmin) return true;

  const user = await UserModel.findOne({ _id: context.userId }).select(
    'role permissionGrants permissionDenials',
  );
  if (!user) return false;

  return permissionsFor({
    role: user.role as Role,
    permissionGrants: user.permissionGrants ?? [],
    permissionDenials: user.permissionDenials ?? [],
  }).has(permission);
}

async function ownLeadsOnly(): Promise<boolean> {
  return !(await actorCan('lead.read.all'));
}

async function requireManage(): Promise<void> {
  if (!(await actorCan('lead.manage'))) throw new Error('You may not change leads.');
}

/** The lead, or nothing when it does not exist or belongs to another salesperson. */
async function visibleLead(id: string) {
  const lead = await leads().findById(id);
  if (!lead) return null;

  if ((await ownLeadsOnly()) && String(lead.ownerId) !== String(getContext().userId)) return null;

  return lead;
}

async function sourceList(): Promise<string[]> {
  const tenant = await TenantModel.findOne({ _id: getContext().tenantId });
  return tenant?.leadSources ?? [];
}

async function prepare(input: LeadInput, currentSource: string | null) {
  const name = input.name.trim();
  if (!name) throw new Error('A lead needs a name.');

  const email = input.email?.trim().toLowerCase() || null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('That email address does not look right.');
  }

  const source = input.source?.trim() || null;
  if (source && source !== currentSource && !(await sourceList()).includes(source)) {
    throw new Error('Choose one of the listed sources.');
  }

  const ownerId = input.ownerId || String(getContext().userId);
  const owner = await UserModel.findOne({
    _id: ownerId,
    tenantId: getContext().tenantId,
    status: 'active',
  });
  if (!owner) throw new Error('The owner must be an active member of the team.');

  return {
    name,
    company: input.company?.trim() || null,
    email,
    mobile: normaliseMobile(input.mobile, input.mobileCountry),
    source,
    ownerId: owner._id,
    notes: input.notes?.trim() || null,
    ...(input.customFields ? { customFields: new Map(Object.entries(input.customFields)) } : {}),
  };
}

/** Escaped so "A+B (Ltd)" matches as text. */
function escapePattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Who in COEX already matches this email, mobile or company name: other leads (any salesperson's,
 * because a duplicate is what the warning exists for), customers and contacts. A warning only;
 * the person decides.
 */
export async function findLeadDuplicates(
  probe: { email?: string; mobile?: string; mobileCountry?: string; company?: string },
  excludeId?: string,
): Promise<LeadDuplicate[]> {
  await connectToDatabase();

  const email = probe.email?.trim().toLowerCase() || null;
  const mobile = normaliseMobile(probe.mobile, probe.mobileCountry);
  const company = probe.company?.trim() || null;
  const found: LeadDuplicate[] = [];

  // The database narrows by the company's first significant word; duplicateReasons then compares
  // the whole normalised names, so "Acme LLC" meets "ACME" but not "Acme Dental".
  const firstWord = normaliseCompany(company).split(' ')[0];
  const companyPattern = firstWord ? { $regex: escapePattern(firstWord), $options: 'i' } : null;

  const identity = [
    ...(email ? [{ email }] : []),
    ...(mobile ? [{ mobile }] : []),
    ...(companyPattern ? [{ company: companyPattern }] : []),
  ];
  if (identity.length === 0) return found;

  const sameLeads = await leads().find({
    ...(excludeId ? { _id: { $ne: new Types.ObjectId(excludeId) } } : {}),
    $or: identity,
  });
  for (const lead of sameLeads) {
    const reasons = duplicateReasons({ email, mobile, company }, lead);
    if (reasons.length) {
      found.push({
        kind: 'lead',
        id: String(lead._id),
        label: `${lead.number} ${lead.name}`,
        reasons,
      });
    }
  }

  const sameContacts = await contactRecords().find({
    $or: [...(email ? [{ email }] : []), ...(mobile ? [{ mobile }] : [])],
  });
  for (const contact of sameContacts) {
    const reasons = duplicateReasons({ email, mobile }, contact);
    if (reasons.length) {
      found.push({ kind: 'contact', id: String(contact._id), label: contact.name, reasons });
    }
  }

  const sameCustomers = await organisations().find({
    $or: [...(email ? [{ email }] : []), ...(companyPattern ? [{ name: companyPattern }] : [])],
  });
  for (const organisation of sameCustomers) {
    const reasons = duplicateReasons(
      { email, company },
      { email: organisation.email, company: organisation.name },
    );
    if (reasons.length) {
      found.push({
        kind: 'customer',
        id: String(organisation._id),
        label: organisation.name,
        reasons,
      });
    }
  }

  return found;
}

export async function createLead(
  input: LeadInput,
  options: { confirmDuplicates?: boolean } = {},
): Promise<string> {
  await connectToDatabase();
  await requireManage();

  const fields = await prepare(input, null);

  if (!options.confirmDuplicates) {
    const duplicates = await findLeadDuplicates({
      email: input.email,
      mobile: input.mobile,
      mobileCountry: input.mobileCountry,
      company: input.company,
    });
    if (duplicates.length) throw new DuplicateLeadError(duplicates);
  }

  const created = await leads().create({
    ...fields,
    number: await nextNumber('lead'),
    status: 'new',
  });

  await recordAudit({
    action: 'lead.created',
    entityType: 'Lead',
    entityId: created._id,
    after: { number: created.number, name: created.name, source: created.source },
  });

  return String(created._id);
}

export async function updateLead(id: string, input: LeadInput): Promise<void> {
  await connectToDatabase();
  await requireManage();

  const before = await visibleLead(id);
  if (!before) throw new Error('Lead not found.');
  if (before.status === 'converted') throw new Error('A converted lead can no longer be edited.');

  const fields = await prepare(input, before.source ?? null);
  const after = await leads().updateOne({ _id: before._id }, { $set: fields });

  await recordAudit({
    action: 'lead.updated',
    entityType: 'Lead',
    entityId: before._id,
    ...changedFields(
      {
        name: before.name,
        company: before.company,
        email: before.email,
        mobile: before.mobile,
        source: before.source,
        ownerId: String(before.ownerId),
      },
      {
        name: after?.name,
        company: after?.company,
        email: after?.email,
        mobile: after?.mobile,
        source: after?.source,
        ownerId: String(after?.ownerId),
      },
    ),
  });
}

/** Marks a new lead as being worked, or puts a disqualified one back to work. */
export async function startWorkingLead(id: string): Promise<void> {
  await connectToDatabase();
  await requireManage();

  const before = await visibleLead(id);
  if (!before) throw new Error('Lead not found.');
  if (before.status === 'converted') throw new Error('A converted lead cannot change status.');
  if (before.status === 'working') return;

  await leads().updateOne(
    { _id: before._id },
    { $set: { status: 'working', disqualifiedReason: null } },
  );

  await recordAudit({
    action: before.status === 'disqualified' ? 'lead.reopened' : 'lead.working',
    entityType: 'Lead',
    entityId: before._id,
    before: { status: before.status, disqualifiedReason: before.disqualifiedReason },
    after: { status: 'working' },
  });
}

/** The lead is kept, never deleted, so the reason is what makes the decision reviewable later. */
export async function disqualifyLead(id: string, reason: string): Promise<void> {
  await connectToDatabase();
  await requireManage();

  const why = reason.trim();
  if (!why) throw new Error('Say why this lead is disqualified.');

  const before = await visibleLead(id);
  if (!before) throw new Error('Lead not found.');
  if (!isOpenLead(before.status as LeadStatus)) {
    throw new Error('Only a lead that is still being worked can be disqualified.');
  }

  await leads().updateOne(
    { _id: before._id },
    { $set: { status: 'disqualified', disqualifiedReason: why } },
  );

  await recordAudit({
    action: 'lead.disqualified',
    entityType: 'Lead',
    entityId: before._id,
    before: { status: before.status },
    after: { status: 'disqualified', reason: why },
  });
}

/** Nothing deletes: an archived lead leaves the list but stays in the audit history. */
export async function archiveLead(id: string): Promise<void> {
  await connectToDatabase();
  await requireManage();

  const lead = await visibleLead(id);
  if (!lead) throw new Error('Lead not found.');

  await leads().updateOne({ _id: lead._id }, { $set: { deletedAt: new Date() } });

  await recordAudit({ action: 'lead.archived', entityType: 'Lead', entityId: lead._id });
}

export interface LeadFilter {
  status?: LeadStatus;
  ownerId?: string;
  source?: string;
  search?: string;
}

export async function listLeads(filter: LeadFilter = {}): Promise<LeadSummary[]> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};

  // A salesperson's own leads, whatever owner the caller asked for.
  if (await ownLeadsOnly()) query.ownerId = new Types.ObjectId(String(getContext().userId));
  else if (filter.ownerId) query.ownerId = new Types.ObjectId(filter.ownerId);

  if (filter.status && (LEAD_STATUSES as readonly string[]).includes(filter.status)) {
    query.status = filter.status;
  }
  if (filter.source) query.source = filter.source;

  if (filter.search?.trim()) {
    const pattern = { $regex: escapePattern(filter.search.trim()), $options: 'i' };
    query.$or = [{ name: pattern }, { company: pattern }, { email: pattern }, { number: pattern }];
  }

  const found = await leads().find(query).sort({ createdAt: -1 });

  const ownerIds = [...new Set(found.map((lead) => String(lead.ownerId)))];
  const owners = ownerIds.length
    ? await UserModel.find({ _id: { $in: ownerIds }, tenantId: getContext().tenantId })
    : [];
  const ownerNames = new Map(owners.map((owner) => [String(owner._id), owner.name]));

  return found.map((lead) => ({
    id: String(lead._id),
    number: lead.number,
    name: lead.name,
    company: lead.company ?? null,
    email: lead.email ?? null,
    mobile: lead.mobile ?? null,
    source: lead.source ?? null,
    ownerId: String(lead.ownerId),
    ownerName: ownerNames.get(String(lead.ownerId)) ?? 'Unknown',
    status: lead.status as LeadStatus,
    disqualifiedReason: lead.disqualifiedReason ?? null,
    notes: lead.notes ?? null,
    customFields: Object.fromEntries(lead.customFields ?? []),
    createdAt: lead.createdAt,
  }));
}

/** The sources a person can choose, from the tenant's own list. */
export async function listLeadSources(): Promise<string[]> {
  await connectToDatabase();
  return sourceList();
}
