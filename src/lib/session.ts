import { Types } from 'mongoose';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { connectToDatabase } from './db';
import { runWithContext, type RequestContext } from './tenant-context';
import { SESSION_COOKIE, resolveSession } from '@/modules/core/services/session.service';
import { UserModel } from '@/modules/core/models/user.model';
import { TenantModel } from '@/modules/core/models/tenant.model';
import { can, permissionsFor, type Permission, type Role } from '@/modules/core/permissions';

/**
 * The bridge between an HTTP request and the tenant context the data layer expects.
 *
 * Every signed in page and every server action starts here. Nothing below this layer needs to know
 * about cookies, and nothing above it needs to remember to pass a tenantId.
 */

export interface SignedInUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string;
  tenantName: string;
  permissions: Permission[];
}

export async function getSignedInUser(): Promise<SignedInUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  await connectToDatabase();

  const session = await resolveSession(token);
  if (!session) return null;

  const user = await UserModel.findOne({ _id: session.userId, status: 'active', deletedAt: null });
  if (!user) return null;

  const tenant = await TenantModel.findOne({
    _id: session.impersonatedTenantId ?? user.tenantId,
    status: 'active',
  });
  if (!tenant) return null;

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role as Role,
    tenantId: String(tenant._id),
    tenantName: tenant.name,
    permissions: [
      ...permissionsFor({
        role: user.role as Role,
        permissionGrants: user.permissionGrants,
        permissionDenials: user.permissionDenials,
      }),
    ],
  };
}

/** For pages behind sign in. Sends anyone without a session to the login screen. */
export async function requireUser(): Promise<SignedInUser> {
  const user = await getSignedInUser();
  if (!user) redirect('/login');
  return user;
}

export async function requirePermission(permission: Permission): Promise<SignedInUser> {
  const user = await requireUser();

  if (!user.permissions.includes(permission)) {
    redirect('/dashboard?denied=' + encodeURIComponent(permission));
  }

  return user;
}

/**
 * Runs work inside the tenant context, which is what makes the repository wrapper able to scope
 * queries without the caller passing a tenantId.
 */
export async function asUser<T>(user: SignedInUser, work: () => Promise<T>): Promise<T> {
  const context: RequestContext = {
    tenantId: toObjectId(user.tenantId),
    userId: toObjectId(user.id),
    isPlatformAdmin: user.role === 'platform_admin',
  };

  return runWithContext(context, work);
}

export function userCan(user: SignedInUser, permission: Permission): boolean {
  return can({ role: user.role, permissionGrants: user.permissions }, permission);
}

export async function requestIpAddress(): Promise<string | null> {
  const headerList = await headers();
  return headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}

export async function requestUserAgent(): Promise<string | null> {
  const headerList = await headers();
  return headerList.get('user-agent');
}

function toObjectId(id: string) {
  return new Types.ObjectId(id);
}
