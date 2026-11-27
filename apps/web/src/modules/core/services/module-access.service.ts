import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { effectiveModules, type WorkspaceModule } from '@coex/shared/core/modules';
import { workspaceAccess } from '@coex/shared/core/saas';
import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';

export class ModuleUnavailableError extends Error {
  constructor(public readonly module: WorkspaceModule) {
    super('This module is not available for this workspace. Contact the platform owner.');
    this.name = 'ModuleUnavailableError';
  }
}
export async function workspaceModules(tenantId = String(getContext().tenantId)) {
  await connectToDatabase();
  const tenant = await TenantModel.findOne({ _id: tenantId, deletedAt: null }).select(
    'status commercial modules',
  );
  if (!tenant || workspaceAccess(tenant.status, tenant.commercial) !== 'allowed')
    return { tasks: false, tickets: false, crm: false, payroll: false };
  return effectiveModules(tenant);
}
export async function moduleAvailable(module: WorkspaceModule, tenantId?: string) {
  return (await workspaceModules(tenantId))[module];
}
export async function assertModuleAccess(module: WorkspaceModule, tenantId?: string) {
  if (!(await moduleAvailable(module, tenantId))) throw new ModuleUnavailableError(module);
}
