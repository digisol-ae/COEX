import { notFound, redirect } from 'next/navigation';
import { getSignedInUser } from './session';
import { publicPortalTenant } from '@/modules/portal/tenant';
import { portalAuthPath } from '@coex/shared/core/portal-links';

export async function portalAuthTenant(slug?: string) {
  if (slug === undefined) return undefined;
  const tenant = await publicPortalTenant(slug);
  if (!tenant) notFound();
  return tenant;
}
export async function requireTenantPortalUser(slug: string) {
  const tenant = await portalAuthTenant(slug);
  const user = await getSignedInUser();
  if (!user || user.role !== 'client_contact' || user.tenantId !== tenant!.id)
    redirect(portalAuthPath('/login', slug));
  if (user.workspaceAccess && user.workspaceAccess !== 'allowed') redirect('/workspace-status');
  return user;
}
