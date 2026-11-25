import { effectiveModules } from '@coex/shared/core/modules';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { connectToDatabase } from '@/lib/db';

export async function publicPortalTenant(slug: string) {
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) return null;
  await connectToDatabase();
  const tenant = await TenantModel.findOne({
    slug,
    status: 'active',
    deletedAt: null,
    'modules.tickets': { $ne: false },
  }).select('_id name slug modules commercial');
  return tenant && effectiveModules(tenant).tickets
    ? { id: String(tenant._id), name: tenant.name, slug: tenant.slug }
    : null;
}

/** Undefined preserves legacy ambiguity rejection. An invalid explicit scope never falls back. */
export async function portalAccountScope(slug?: string) {
  if (slug === undefined) return {};
  const tenant = await publicPortalTenant(slug);
  return tenant ? { tenantId: tenant.id, role: 'client_contact' as const } : null;
}

export async function tokenMatchesPortal(tenantId: unknown, slug?: string) {
  if (slug === undefined) return true;
  const tenant = await publicPortalTenant(slug);
  return Boolean(tenant && tenant.id === String(tenantId));
}
