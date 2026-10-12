import { getContext } from '@/lib/tenant-context';
import { permissionsFor, type Permission, type Role } from '@coex/shared/core/permissions';
import { UserModel } from '@coex/shared/core/models/user.model';

/**
 * Whether the signed-in person holds a permission, read from their account rather than taken from
 * the caller, so a service refuses on its own even when a screen forgets to check.
 */
export async function actorCan(permission: Permission): Promise<boolean> {
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
