import { getContext } from '@/lib/tenant-context';
import { UserModel } from '@/modules/core/models/user.model';

/** Tenant administrators remain able to administer private task areas. */
export async function actorIsAdministrator(): Promise<boolean> {
  const context = getContext();
  if (context.isPlatformAdmin) return true;
  const user = await UserModel.findOne({ _id: context.userId }).select('role');
  return user?.role === 'tenant_admin';
}
