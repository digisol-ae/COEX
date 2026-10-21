import { cache } from 'react';
import { Types } from 'mongoose';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { runWithContext, type RequestContext } from './tenant-context';
import { SESSION_COOKIE } from '@/modules/core/services/session.service';
import {
  resolveAuthenticatedUser,
  type AuthenticatedUser,
  type Theme,
} from '@/modules/core/services/auth-context.service';
import { can, type Permission } from '@coex/shared/core/permissions';

/**
 * The bridge between an HTTP request and the tenant context the data layer expects.
 *
 * Every signed in page and every server action starts here. Nothing below this layer needs to know
 * about cookies, and nothing above it needs to remember to pass a tenantId.
 */

export type SignedInUser = AuthenticatedUser;

export type { Theme };

/**
 * Cached per request: the root layout reads it for the theme and every page reads it again, and
 * both should cost one lookup. The lookup itself lives in auth-context.service so the Express API
 * resolves sessions exactly the same way.
 */
export const getSignedInUser = cache(
  async function getSignedInUser(): Promise<SignedInUser | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (!token) return null;

    return resolveAuthenticatedUser(token);
  },
);

/** For pages behind sign in. Sends anyone without a session to the login screen. */
export async function requireUser(): Promise<SignedInUser> {
  const user = await getSignedInUser();
  if (!user) redirect('/login');
  return user;
}

/** Staff-only entry point for authenticated internal pages/actions that do not need a specific permission. */
export async function requireStaffUser(): Promise<SignedInUser> {
  const user = await requireUser();
  if (user.role === 'client_contact') redirect('/portal');
  return user;
}

export async function requirePermission(permission: Permission): Promise<SignedInUser> {
  const user = await requireUser();
  if (user.role === 'client_contact') redirect('/portal');

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
