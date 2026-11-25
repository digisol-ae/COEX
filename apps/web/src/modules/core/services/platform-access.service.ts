import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { UserModel } from '@coex/shared/core/models/user.model';

/** Platform powers cannot be acquired through an ordinary permission override. */
export async function requirePlatformAdministrator() {
  const context = getContext();
  if (!context.isPlatformAdmin) throw new Error('Only the platform owner may do that.');
  await connectToDatabase();
  const actor = await UserModel.findOne({
    _id: context.userId,
    role: 'platform_admin',
    status: 'active',
    deletedAt: null,
  });
  if (!actor) throw new Error('Only the platform owner may do that.');
  return actor;
}
