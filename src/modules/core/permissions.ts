/**
 * Roles and permissions for COEX.
 *
 * A user carries one named role plus an override list, so an exception for one person never
 * requires inventing a new role. Permissions are plain strings in module.action form, checked by
 * services rather than by components.
 */

export const ROLES = [
  'platform_admin',
  'tenant_admin',
  'manager',
  'agent',
  'client_contact',
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'tenant.read',
  'tenant.manage',
  'tenant.create',
  'user.read',
  'user.manage',
  'audit.read',
  'customer.read',
  'customer.manage',
  'task.read.own',
  'task.read.all',
  'task.manage',
  'ticket.read.own',
  'ticket.read.all',
  'ticket.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  platform_admin: PERMISSIONS,
  tenant_admin: [
    'tenant.read',
    'tenant.manage',
    'user.read',
    'user.manage',
    'audit.read',
    'customer.read',
    'customer.manage',
    'task.read.all',
    'task.manage',
    'ticket.read.all',
    'ticket.manage',
  ],
  manager: [
    'tenant.read',
    'user.read',
    'customer.read',
    'customer.manage',
    'task.read.all',
    'task.manage',
    'ticket.read.all',
    'ticket.manage',
  ],
  agent: [
    'tenant.read',
    'customer.read',
    'task.read.own',
    'task.manage',
    'ticket.read.own',
    'ticket.manage',
  ],
  client_contact: ['ticket.read.own'],
};

export interface PermissionHolder {
  role: Role;
  /** Granted on top of the role. */
  permissionGrants?: readonly string[];
  /** Removed from the role, and a denial always wins over a grant. */
  permissionDenials?: readonly string[];
}

export function permissionsFor(holder: PermissionHolder): Set<Permission> {
  const granted = new Set<Permission>(ROLE_PERMISSIONS[holder.role]);

  for (const permission of holder.permissionGrants ?? []) {
    if (isPermission(permission)) granted.add(permission);
  }

  for (const permission of holder.permissionDenials ?? []) {
    if (isPermission(permission)) granted.delete(permission);
  }

  return granted;
}

export function can(holder: PermissionHolder, permission: Permission): boolean {
  return permissionsFor(holder).has(permission);
}

function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}
