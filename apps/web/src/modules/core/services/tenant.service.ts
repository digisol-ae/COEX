import { Types } from 'mongoose';
import { STAFF_ROLES } from '@coex/shared/core/permissions';
import { effectiveModules, type ModuleAllowance } from '@coex/shared/core/modules';
import { occupiedStaff } from './subscription.service';
import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { AuditLogModel } from '@coex/shared/core/models/audit-log.model';
import { QueueModel } from '@coex/shared/tickets/models/queue.model';
import { recordAudit, changedFields } from './audit.service';
import { hashPassword } from '@/lib/password';
import { randomBytes } from 'node:crypto';
import {
  DAY_MS,
  DEFAULT_STORAGE_LIMIT_BYTES,
  positiveInteger,
  workspaceAccess,
} from '@coex/shared/core/saas';
import { requirePlatformAdministrator } from './platform-access.service';
import { provisioningDefaults } from './platform-settings.service';
import { initialiseStorageUsage } from '@/lib/storage';

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
  modules: ModuleAllowance;
  effectiveModules: ModuleAllowance;
  staffCount: number;
  portalCount: number;
  plan: string | null;
  seats: number | null;
  accessEndsAt: Date | null;
  createdAt: Date;
  commercialStatus: string;
  trialEndsAt: Date | null;
  storageLimitBytes: number;
  storageUsedBytes: number;
  access: ReturnType<typeof workspaceAccess>;
}

export async function listTenants(): Promise<TenantSummary[]> {
  await requirePlatformAdministrator();
  await connectToDatabase();

  const tenants = await TenantModel.find({ deletedAt: null }).sort({ createdAt: 1 });

  return Promise.all(
    tenants.map(async (tenant) => ({
      id: String(tenant._id),
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      modules: {
        tasks: tenant.modules?.tasks !== false,
        tickets: tenant.modules?.tickets !== false,
        crm: tenant.modules?.crm !== false,
      },
      effectiveModules: effectiveModules(tenant),
      userCount: await UserModel.countDocuments({ tenantId: tenant._id, deletedAt: null }),
      staffCount: await UserModel.countDocuments({ tenantId: tenant._id, ...occupiedStaff }),
      portalCount: await UserModel.countDocuments({
        tenantId: tenant._id,
        role: 'client_contact',
        deletedAt: null,
      }),
      plan: tenant.commercial?.plan ?? null,
      seats: tenant.commercial?.seats ?? null,
      accessEndsAt: tenant.commercial?.accessEndsAt ?? null,
      createdAt: tenant.createdAt,
      commercialStatus: tenant.commercial?.status ?? 'legacy',
      trialEndsAt: tenant.commercial?.trialEndsAt ?? null,
      storageLimitBytes: tenant.storageLimitBytes ?? DEFAULT_STORAGE_LIMIT_BYTES,
      storageUsedBytes: await initialiseStorageUsage(String(tenant._id)),
      access: workspaceAccess(tenant.status, tenant.commercial),
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
  await requirePlatformAdministrator();
  await connectToDatabase();

  if (
    !input.name.trim() ||
    input.name.length > 200 ||
    !input.adminName.trim() ||
    input.adminName.length > 200
  )
    throw new Error('Enter a company name and administrator name of at most 200 characters.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.adminEmail.trim()) || input.adminEmail.length > 254)
    throw new Error('Enter a valid administrator email.');
  // The current login resolves one account per email. Do not provision an ambiguous login.
  if (await UserModel.exists({ email: input.adminEmail.trim().toLowerCase(), deletedAt: null }))
    throw new Error('That email already has an account. Use a separate administrator email.');

  const slug = input.slug.trim().toLowerCase();

  if (['new', 'tickets', 'profile'].includes(slug))
    throw new Error(
      'Choose a different identifier; that word is reserved for customer portal navigation.',
    );

  if (!/^[a-z0-9-]{2,40}$/.test(slug)) {
    throw new Error('The identifier may use lower case letters, numbers and hyphens only.');
  }

  if (await TenantModel.findOne({ slug })) {
    throw new Error('That identifier is already taken.');
  }

  const defaults = await provisioningDefaults();
  const now = new Date();
  const password = randomBytes(9).toString('base64url');
  const passwordHash = await hashPassword(password);
  const database = await connectToDatabase();
  const context = getContext();
  await database.connection.transaction(async (session) => {
    const [tenant] = await TenantModel.create(
      [
        {
          name: input.name.trim(),
          slug,
          storageLimitBytes: defaults.storageLimitBytes,
          storageUsedBytes: 0,
          commercial: {
            status: 'trialing',
            startedAt: now,
            trialEndsAt: new Date(now.getTime() + defaults.trialDays * DAY_MS),
          },
        },
      ],
      { session },
    );
    const [admin] = await UserModel.create(
      [
        {
          tenantId: tenant._id,
          name: input.adminName.trim(),
          email: input.adminEmail.trim().toLowerCase(),
          role: 'tenant_admin',
          passwordHash,
          mustChangePassword: true,
          status: 'active',
        },
      ],
      { session },
    );
    await QueueModel.create(
      [
        {
          tenantId: tenant._id,
          name: 'General support',
          description: 'Everything that has not been sorted into a queue of its own yet.',
          isDefault: true,
          status: 'active',
        },
      ],
      { session },
    );
    await AuditLogModel.create(
      [
        {
          tenantId: tenant._id,
          actorId: context.userId,
          action: 'tenant.created',
          entityType: 'Tenant',
          entityId: tenant._id,
          after: { name: tenant.name, slug: tenant.slug, firstAdministrator: admin.email },
        },
        {
          tenantId: context.tenantId,
          actorId: context.userId,
          action: 'tenant.created',
          entityType: 'Tenant',
          entityId: tenant._id,
          after: { name: tenant.name, slug: tenant.slug },
        },
      ],
      { session, ordered: true },
    );
  });

  return { password };
}

/** Extend from the later of now and the current expiry; an extension cannot shorten a trial. */
export async function extendTenantTrial(tenantId: string, days: number, reason: string) {
  await requirePlatformAdministrator();
  positiveInteger(days, 'Extension days', 3650);
  if (!reason.trim() || reason.length > 500)
    throw new Error('Enter a reason of at most 500 characters.');
  const tenant = await TenantModel.findOne({ _id: tenantId, deletedAt: null });
  if (!tenant || !['trialing', 'expired'].includes(tenant.commercial?.status ?? 'legacy'))
    throw new Error('Only a trial workspace can receive a trial extension.');
  if (tenant.status !== 'active')
    throw new Error('A suspended workspace must be reviewed before extending its trial.');
  const previous = tenant.commercial?.trialEndsAt ?? null;
  const next = new Date(Math.max(Date.now(), previous?.getTime() ?? 0) + days * DAY_MS);
  const changed = await TenantModel.updateOne(
    { _id: tenant._id, updatedAt: tenant.updatedAt },
    {
      $set: { 'commercial.status': 'trialing', 'commercial.trialEndsAt': next },
    },
  );
  if (changed.modifiedCount !== 1)
    throw new Error('Workspace changed. Refresh before extending again.');
  await recordAudit({
    action: 'tenant.trial_extended',
    entityType: 'Tenant',
    entityId: tenant._id,
    before: { trialEndsAt: previous },
    after: { trialEndsAt: next, reason: reason.trim() },
  });
}

export async function setTenantStorageLimit(tenantId: string, bytes: number, reason: string) {
  await requirePlatformAdministrator();
  positiveInteger(bytes, 'Storage bytes');
  if (!reason.trim() || reason.length > 500)
    throw new Error('Enter a reason of at most 500 characters.');
  const tenant = await TenantModel.findOne({ _id: tenantId, deletedAt: null });
  if (!tenant) throw new Error('Workspace not found.');
  const used = await initialiseStorageUsage(tenantId);
  if (bytes < used) throw new Error('The storage allowance cannot be lower than current usage.');
  const changed = await TenantModel.updateOne(
    { _id: tenant._id, storageUsedBytes: { $lte: bytes } },
    { $set: { storageLimitBytes: bytes } },
  );
  if (changed.matchedCount !== 1)
    throw new Error('Storage usage changed. Refresh before setting the limit.');
  await recordAudit({
    action: 'tenant.storage_limit_updated',
    entityType: 'Tenant',
    entityId: tenant._id,
    before: { storageLimitBytes: tenant.storageLimitBytes ?? DEFAULT_STORAGE_LIMIT_BYTES },
    after: { storageLimitBytes: bytes, reason: reason.trim() },
  });
}
