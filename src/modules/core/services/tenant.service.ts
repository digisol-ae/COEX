import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { TenantModel } from '../models/tenant.model';
import { UserModel } from '../models/user.model';
import { AuditLogModel } from '../models/audit-log.model';
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

export interface TenantSettingsInput {
  name: string;
  timezone: string;
  currency: string;
  taskPrefix: string;
  ticketPrefix: string;
  attachmentRetentionMonths: number;
}

export async function updateTenantSettings(input: TenantSettingsInput): Promise<void> {
  const tenant = await getCurrentTenant();

  const before = {
    name: tenant.name,
    timezone: tenant.timezone,
    currency: tenant.currency,
    taskPrefix: tenant.numbering?.taskPrefix ?? '',
    ticketPrefix: tenant.numbering?.ticketPrefix ?? '',
    attachmentRetentionMonths: tenant.attachmentRetentionMonths,
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
        attachmentRetentionMonths: input.attachmentRetentionMonths,
      },
    },
  );

  await recordAudit({
    action: 'tenant.settings_updated',
    entityType: 'Tenant',
    entityId: tenant._id,
    ...changedFields(before, { ...input, name: input.name.trim() }),
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
