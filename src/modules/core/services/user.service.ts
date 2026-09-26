import { randomBytes } from 'node:crypto';
import { connectToDatabase } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { repository } from '@/lib/repository';
import { getContext } from '@/lib/tenant-context';
import { toObjectId } from '@/lib/ids';
import { UserModel } from '../models/user.model';
import { recordAudit, changedFields } from './audit.service';
import { revokeAllSessionsForUser } from './session.service';
import type { Role, Permission } from '../permissions';
import { PERMISSIONS } from '../permissions';

/**
 * User administration inside one tenant.
 *
 * Every function here runs inside a request context, so the repository scopes each query to the
 * signed in tenant. A tenant administrator cannot reach another tenant's users even by guessing an
 * identifier, because the identifier alone never satisfies the filter.
 */

const users = () => repository(UserModel);

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: string;
  lastSignedInAt: Date | null;
  createdAt: Date;
  permissionGrants: string[];
  permissionDenials: string[];
}

export async function listUsers(): Promise<UserSummary[]> {
  await connectToDatabase();

  const found = await users().find().sort({ createdAt: 1 });

  return found.map((user) => ({
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role as Role,
    status: user.status,
    lastSignedInAt: user.lastSignedInAt ?? null,
    createdAt: user.createdAt,
    permissionGrants: user.permissionGrants ?? [],
    permissionDenials: user.permissionDenials ?? [],
  }));
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: Role;
  title?: string;
}

/** Returns the generated password once, for the administrator to pass on. */
export async function createUser(input: CreateUserInput): Promise<{ password: string }> {
  await connectToDatabase();

  const email = input.email.trim().toLowerCase();
  const existing = await users().findOne({ email });

  if (existing) {
    throw new Error('A user with that email already exists in this tenant.');
  }

  const password = randomBytes(9).toString('base64url');

  const created = await users().create({
    name: input.name.trim(),
    email,
    title: input.title?.trim() || null,
    role: input.role,
    passwordHash: await hashPassword(password),
    mustChangePassword: true,
    status: 'active',
  });

  await recordAudit({
    action: 'user.created',
    entityType: 'User',
    entityId: created._id,
    after: { name: created.name, email: created.email, role: created.role },
  });

  return { password };
}

export async function updateUserRole(userId: string, role: Role): Promise<void> {
  await connectToDatabase();

  const before = await users().findById(userId);
  if (!before) throw new Error('User not found.');

  const after = await users().updateOne({ _id: before._id }, { $set: { role } });
  if (!after) throw new Error('User not found.');

  await recordAudit({
    action: 'user.role_changed',
    entityType: 'User',
    entityId: before._id,
    ...changedFields({ role: before.role }, { role: after.role }),
  });
}

/**
 * Per-user overrides on top of the role.
 *
 * A grant adds a permission the role would not otherwise carry; a denial removes one the role
 * would otherwise carry, and a denial always wins if a permission somehow ends up in both lists.
 * This is how "sees only CRM and Products, and nothing else but their own password reset" gets
 * built without inventing a role for one person: deny everything the role grants beyond that,
 * rather than starting a new role that only one person will ever have.
 */
export async function updateUserAccess(
  userId: string,
  input: { grants: Permission[]; denials: Permission[] },
): Promise<void> {
  await connectToDatabase();

  const before = await users().findById(userId);
  if (!before) throw new Error('User not found.');

  const valid = new Set<string>(PERMISSIONS);
  const grants = input.grants.filter((permission) => valid.has(permission));
  const denials = input.denials.filter((permission) => valid.has(permission));

  await users().updateOne(
    { _id: before._id },
    { $set: { permissionGrants: grants, permissionDenials: denials } },
  );

  await recordAudit({
    action: 'user.access_changed',
    entityType: 'User',
    entityId: before._id,
    before: { permissionGrants: before.permissionGrants, permissionDenials: before.permissionDenials },
    after: { permissionGrants: grants, permissionDenials: denials },
  });
}

export async function setUserStatus(userId: string, status: 'active' | 'suspended'): Promise<void> {
  await connectToDatabase();

  const before = await users().findById(userId);
  if (!before) throw new Error('User not found.');

  await users().updateOne({ _id: before._id }, { $set: { status } });

  // A suspended account must lose its open sessions immediately, otherwise suspension only takes
  // effect when the cookie happens to expire.
  if (status === 'suspended') {
    await revokeAllSessionsForUser(before._id);
  }

  await recordAudit({
    action: status === 'suspended' ? 'user.suspended' : 'user.reactivated',
    entityType: 'User',
    entityId: before._id,
    ...changedFields({ status: before.status }, { status }),
  });
}

export async function resetPassword(userId: string): Promise<{ password: string }> {
  await connectToDatabase();

  const user = await users().findById(userId);
  if (!user) throw new Error('User not found.');

  const password = randomBytes(9).toString('base64url');

  await users().updateOne(
    { _id: user._id },
    { $set: { passwordHash: await hashPassword(password), mustChangePassword: true } },
  );

  await revokeAllSessionsForUser(user._id);

  await recordAudit({
    action: 'user.password_reset',
    entityType: 'User',
    entityId: user._id,
  });

  return { password };
}

/** The signed-in person's menu order; empty means the standard order. */
export async function getNavigationOrder(): Promise<string[]> {
  await connectToDatabase();
  const user = await users().findById(String(getContext().userId)).select('navigationOrder');
  return user?.navigationOrder ?? [];
}

/**
 * Saves the signed-in person's menu order. Only ever their own: this reorders what they can
 * already see and grants nothing, so it needs no permission beyond being signed in.
 */
export async function saveNavigationOrder(order: string[]): Promise<void> {
  await connectToDatabase();
  const clean = [...new Set(order.map((id) => id.trim()).filter(Boolean))].slice(0, 30);
  if (clean.some((id) => id.length > 40)) throw new Error('That menu order is not valid.');
  await users().updateOne(
    { _id: toObjectId(String(getContext().userId)) },
    { $set: { navigationOrder: clean } },
  );
}
