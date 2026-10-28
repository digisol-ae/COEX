import { STAFF_ROLES } from '@coex/shared/core/permissions';
import { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { UserModel } from '@coex/shared/core/models/user.model';
import type { Role } from '@coex/shared/core/permissions';
export interface StaffSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: string;
}
/** Staff selectors and history labels must not fetch customer portal accounts or credentials. */
export async function listStaffUsers(
  options: { activeOnly?: boolean } = {},
): Promise<StaffSummary[]> {
  await connectToDatabase();
  const found = await repository(UserModel)
    .find({ role: { $in: [...STAFF_ROLES] }, ...(options.activeOnly ? { status: 'active' } : {}) })
    .select('name email role status')
    .sort({ createdAt: 1 })
    .lean();
  return found.map((user) => ({
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role as Role,
    status: user.status,
  }));
}
/** Check only additions so an unchanged historical assignment is preserved. */
export async function assertStaffAdditions(
  ids: string[],
  retainedIds: string[] = [],
): Promise<void> {
  const selected = [...new Set(ids.filter(Boolean))];
  const retained = new Set(retainedIds);
  const added = selected.filter((id) => !retained.has(id));
  if (!selected.length) return;
  if (selected.some((id) => !Types.ObjectId.isValid(id)))
    throw new Error('Choose active staff from this workspace.');
  await connectToDatabase();
  // Historical suspended/deleted staff may stay assigned; customer accounts never qualify.
  const staffCount = await repository(UserModel).count(
    { _id: { $in: selected.map((id) => new Types.ObjectId(id)) }, role: { $in: [...STAFF_ROLES] } },
    { withDeleted: true },
  );
  if (staffCount !== selected.length) throw new Error('Choose active staff from this workspace.');
  if (!added.length) return;
  const found = await repository(UserModel).count({
    _id: { $in: added.map((id) => new Types.ObjectId(id)) },
    role: { $in: [...STAFF_ROLES] },
    status: 'active',
  });
  if (found !== added.length) throw new Error('Choose active staff from this workspace.');
}
