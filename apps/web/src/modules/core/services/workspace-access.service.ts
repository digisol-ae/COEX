import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { workspaceAccess } from '@coex/shared/core/saas';
import { connectToDatabase } from '@/lib/db';

export async function assertWorkspaceAccess(tenantId: string) {
  await connectToDatabase();
  const tenant = await TenantModel.findOne({ _id: tenantId, deletedAt: null });
  if (!tenant || workspaceAccess(tenant.status, tenant.commercial) !== 'allowed')
    throw new Error(
      'This workspace is unavailable. Contact the platform owner to renew or extend access.',
    );
}
