import { UserModel } from '@coex/shared/core/models/user.model';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { permissionsFor, type Permission, type Role } from '@coex/shared/core/permissions';
import { connectToDatabase } from '@/lib/db';
import { resolveSession } from './session.service';

/**
 * Who is behind a session cookie, with the permissions they hold.
 *
 * Framework free on purpose: the Next.js app (src/lib/session.ts) and the Express API
 * (apps/api) both resolve a session through this one function, so the two can never disagree about
 * who someone is or what they may do. That is what lets a person stay signed in on both while a
 * module moves from one to the other (docs/ARCHITECTURE-REVAMP.md).
 */

export type Theme = 'sunset' | 'light' | 'dark';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string;
  tenantName: string;
  permissions: Permission[];
  theme: Theme;
  /** The What's new release this person has acknowledged; null for none yet. */
  releaseNotesSeen: string | null;
}

export async function resolveAuthenticatedUser(token: string): Promise<AuthenticatedUser | null> {
  await connectToDatabase();

  const session = await resolveSession(token);
  if (!session) return null;

  const user = await UserModel.findOne({
    _id: session.userId,
    status: 'active',
    deletedAt: null,
  });
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
    theme: (user.theme as Theme | undefined) ?? 'sunset',
    releaseNotesSeen: user.releaseNotesSeen ?? null,
  };
}
