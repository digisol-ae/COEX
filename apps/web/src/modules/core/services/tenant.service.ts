import { Types } from 'mongoose';
import { STAFF_ROLES } from '@coex/shared/core/permissions';
import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { AuditLogModel } from '@coex/shared/core/models/audit-log.model';
import { QueueModel } from '@coex/shared/tickets/models/queue.model';
import { recordAudit, changedFields } from './audit.service';
import { hashPassword } from '@/lib/password';
import { randomBytes } from 'node:crypto';

/**
 * Tenant settings and tenant creation.
 *
 * The tenant collection is the one place the repository wrapper cannot scope by tenantId, because
 * the tenant record is itself the tenant. Reads therefore use the context identifier directly, and
 * creation is restricted to platform administrators by the calling page.
 */

export async function getCurrentTenant() {
  await connectToDatabase();

  const { tenantId } = getContext();
  const tenant = await TenantModel.findOne({ _id: tenantId, deletedAt: null });

  if (!tenant) throw new Error('Tenant not found.');

  return tenant;
}

export async function listContractProviderSigners() {
  const { tenantId } = getContext();
  return UserModel.find({ tenantId, role: { $in: STAFF_ROLES }, status: 'active', deletedAt: null })
    .select('name email')
    .sort({ name: 1 })
    .lean();
}

export interface TenantSettingsInput {
  name: string;
  timezone: string;
  currency: string;
  taskPrefix: string;
  ticketPrefix: string;
  leadPrefix: string;
  opportunityPrefix: string;
  leadSources: string[];
  attachmentRetentionMonths: number;
  workingDays: number[];
  dayStartMinutes: number;
  dayEndMinutes: number;
  agreementDefaults?: {
    supportPortal: string;
    supportEmail: string;
    supportPhone: string;
    supportWhatsapp: string;
    providerSignerId: string;
  };
  letterhead?: {
    address: string;
    contact: string;
    footer: string;
    logoDataUrl?: string;
    color: string;
  };
}

export async function updateTenantSettings(input: TenantSettingsInput): Promise<void> {
  const tenant = await getCurrentTenant();
  const { letterhead, agreementDefaults: agreement, ...settings } = input;
  if (
    agreement?.providerSignerId &&
    (!Types.ObjectId.isValid(agreement.providerSignerId) ||
      !(await listContractProviderSigners()).some(
        (staff) => String(staff._id) === agreement.providerSignerId,
      ))
  )
    throw new Error('Choose an active staff member as the default First Party signer.');
  const agreementDefaults = agreement && {
    supportPortal: agreement.supportPortal.trim(),
    supportEmail: agreement.supportEmail.trim(),
    supportPhone: agreement.supportPhone.trim(),
    supportWhatsapp: agreement.supportWhatsapp.trim(),
    providerSignerId: agreement.providerSignerId
      ? new Types.ObjectId(agreement.providerSignerId)
      : null,
  };
  if (agreement && Object.values(agreement).some((value) => value.length > 300))
    throw new Error('Agreement defaults must be at most 300 characters each.');

  if (letterhead) {
    if (
      letterhead.address.length > 2000 ||
      letterhead.contact.length > 1000 ||
      letterhead.footer.length > 1000
    )
      throw new Error('Letterhead address or footer is too long.');
    if (!/^#[0-9a-f]{6}$/i.test(letterhead.color))
      throw new Error('Choose a valid letterhead colour.');
    if (
      letterhead.logoDataUrl !== undefined &&
      (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(letterhead.logoDataUrl) ||
        letterhead.logoDataUrl.length > 600000)
    )
      throw new Error('Upload a PNG, JPEG or WebP logo of at most 2 MB.');
  }

  const before = {
    name: tenant.name,
    timezone: tenant.timezone,
    currency: tenant.currency,
    taskPrefix: tenant.numbering?.taskPrefix ?? '',
    ticketPrefix: tenant.numbering?.ticketPrefix ?? '',
    leadPrefix: tenant.numbering?.leadPrefix ?? '',
    opportunityPrefix: tenant.numbering?.opportunityPrefix ?? '',
    leadSources: tenant.leadSources,
    attachmentRetentionMonths: tenant.attachmentRetentionMonths,
    workingDays: tenant.workingDays,
    dayStartMinutes: tenant.dayStartMinutes,
    dayEndMinutes: tenant.dayEndMinutes,
    ...(agreement && { agreementDefaults: tenant.agreementDefaults }),
    ...(letterhead
      ? {
          letterhead: {
            address: tenant.branding?.letterhead?.address ?? '',
            contact: tenant.branding?.letterhead?.contact ?? '',
            footer: tenant.branding?.letterhead?.footer ?? '',
            color: tenant.branding?.primaryColor ?? '#0f172a',
            hasLogo: Boolean(tenant.branding?.letterhead?.logoDataUrl),
          },
        }
      : {}),
  };

  await TenantModel.updateOne(
    { _id: tenant._id },
    {
      $set: {
        name: input.name.trim(),
        timezone: input.timezone,
        currency: input.currency,
        'numbering.taskPrefix': input.taskPrefix.trim(),
        'numbering.ticketPrefix': input.ticketPrefix.trim(),
        'numbering.leadPrefix': input.leadPrefix.trim() || 'L',
        'numbering.opportunityPrefix': input.opportunityPrefix.trim() || 'O',
        leadSources: input.leadSources,
        attachmentRetentionMonths: input.attachmentRetentionMonths,
        workingDays: input.workingDays,
        dayStartMinutes: input.dayStartMinutes,
        dayEndMinutes: input.dayEndMinutes,
        ...(agreementDefaults && { agreementDefaults }),
        ...(letterhead
          ? {
              'branding.letterhead.address': letterhead.address.trim(),
              'branding.letterhead.contact': letterhead.contact.trim(),
              'branding.letterhead.footer': letterhead.footer.trim(),
              'branding.primaryColor': letterhead.color,
              ...(letterhead.logoDataUrl !== undefined
                ? { 'branding.letterhead.logoDataUrl': letterhead.logoDataUrl }
                : {}),
            }
          : {}),
      },
    },
  );

  await recordAudit({
    action: 'tenant.settings_updated',
    entityType: 'Tenant',
    entityId: tenant._id,
    ...changedFields(before, {
      ...settings,
      ...(agreementDefaults && { agreementDefaults }),
      name: input.name.trim(),
      ...(letterhead
        ? {
            letterhead: {
              address: letterhead.address.trim(),
              contact: letterhead.contact.trim(),
              footer: letterhead.footer.trim(),
              color: letterhead.color,
              hasLogo: Boolean(letterhead.logoDataUrl ?? tenant.branding?.letterhead?.logoDataUrl),
            },
          }
        : {}),
    }),
  });
}

export interface TenantSummary {
  id: string;
  name: string;
  slug: string;
  status: string;
  userCount: number;
  createdAt: Date;
}

export async function listTenants(): Promise<TenantSummary[]> {
  await connectToDatabase();

  const tenants = await TenantModel.find({ deletedAt: null }).sort({ createdAt: 1 });

  return Promise.all(
    tenants.map(async (tenant) => ({
      id: String(tenant._id),
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      userCount: await UserModel.countDocuments({ tenantId: tenant._id, deletedAt: null }),
      createdAt: tenant.createdAt,
    })),
  );
}

export interface CreateTenantInput {
  name: string;
  slug: string;
  adminName: string;
  adminEmail: string;
}

/**
 * Creates a tenant and its first administrator in one step, because a tenant nobody can sign in to
 * is not a tenant. Only a platform administrator may call this.
 */
export async function createTenant(input: CreateTenantInput): Promise<{ password: string }> {
  await connectToDatabase();

  const slug = input.slug.trim().toLowerCase();

  if (!/^[a-z0-9-]{2,40}$/.test(slug)) {
    throw new Error('The identifier may use lower case letters, numbers and hyphens only.');
  }

  if (await TenantModel.findOne({ slug })) {
    throw new Error('That identifier is already taken.');
  }

  const tenant = await TenantModel.create({ name: input.name.trim(), slug });

  const password = randomBytes(9).toString('base64url');

  const admin = await UserModel.create({
    tenantId: tenant._id,
    name: input.adminName.trim(),
    email: input.adminEmail.trim().toLowerCase(),
    role: 'tenant_admin',
    passwordHash: await hashPassword(password),
    mustChangePassword: true,
    status: 'active',
  });

  // A tenant with no queue cannot accept a ticket, so day one comes with one rather than with a
  // dead end. It is renamed far more often than it is deleted, which is why it is named plainly.
  await QueueModel.create({
    tenantId: tenant._id,
    name: 'General support',
    description: 'Everything that has not been sorted into a queue of its own yet.',
    isDefault: true,
    status: 'active',
  });

  // Written against the new tenant, so the new tenant's own audit trail starts with its creation.
  await AuditLogModel.create({
    tenantId: tenant._id,
    actorId: getContext().userId,
    action: 'tenant.created',
    entityType: 'Tenant',
    entityId: tenant._id,
    after: { name: tenant.name, slug: tenant.slug, firstAdministrator: admin.email },
  });

  await recordAudit({
    action: 'tenant.created',
    entityType: 'Tenant',
    entityId: tenant._id,
    after: { name: tenant.name, slug: tenant.slug },
  });

  return { password };
}
