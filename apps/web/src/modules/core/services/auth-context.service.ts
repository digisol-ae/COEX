import { effectiveModules, modulePermissions } from '@coex/shared/core/modules';
import { UserModel } from '@coex/shared/core/models/user.model';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { permissionsFor, type Permission, type Role } from '@coex/shared/core/permissions';
import { connectToDatabase } from '@/lib/db';
import { resolveSession } from './session.service';
import { workspaceAccess } from '@coex/shared/core/saas';

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
  tenantSlug?: string;
  permissions: Permission[];
  theme: Theme;
  /** The What's new release this person has acknowledged; null for none yet. */
  releaseNotesSeen: string | null;
  workspaceAccess?: ReturnType<typeof workspaceAccess>;
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
  if (!user || user.mustChangePassword) return null;

  if (String(session.tenantId) !== String(user.tenantId)) return null;
  if (session.impersonatedTenantId && user.role !== 'platform_admin') return null;

  const tenant = await TenantModel.findOne({
    _id: session.impersonatedTenantId ?? user.tenantId,
    deletedAt: null,
  });
  if (!tenant) return null;

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role as Role,
    tenantId: String(tenant._id),
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    workspaceAccess: workspaceAccess(tenant.status, tenant.commercial),
    permissions: modulePermissions(
      permissionsFor({
        role: user.role as Role,
        permissionGrants: user.permissionGrants,
        permissionDenials: user.permissionDenials,
      }),
      effectiveModules(tenant),
    ),
    theme: (user.theme as Theme | undefined) ?? 'sunset',
    releaseNotesSeen: user.releaseNotesSeen ?? null,
  };
}
