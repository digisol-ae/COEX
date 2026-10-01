import { getContext } from '@/lib/tenant-context';
import { UserModel } from '@/modules/core/models/user.model';
import { permissionsFor, type Permission, type Role } from '@/modules/core/permissions';

/** Tenant administrators remain able to administer private task areas. */
export async function actorIsAdministrator(): Promise<boolean> {
  const context = getContext();
  if (context.isPlatformAdmin) return true;
  const user = await UserModel.findOne({ _id: context.userId }).select('role');
  return user?.role === 'tenant_admin';
}

/**
 * Whether the signed-in person holds a permission, read from their account rather than taken
 * from the caller, so a service can refuse on its own even when a screen forgets to check.
 */
export async function actorHasPermission(permission: Permission): Promise<boolean> {
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
