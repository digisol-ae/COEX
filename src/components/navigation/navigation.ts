import type { Permission } from '@/modules/core/permissions';

/**
 * The shape of the product, expressed as menus.
 *
 * Groups are named after the part of the business they serve rather than after the module that
 * happens to implement them, because the people using COEX think in terms of their work. New
 * modules add a group here and nothing else: the sidebar, the permissions filtering and the
 * expand state all follow from this one list.
 */

export interface NavigationItem {
  href: string;
  label: string;
  permission?: Permission;
}

export interface NavigationGroup {
  id: string;
  label: string;
  items: NavigationItem[];
}

/** Sits above the groups, because it is where everyone starts. */
export const HOME: NavigationItem = { href: '/dashboard', label: 'Dashboard' };

export const GROUPS: NavigationGroup[] = [
  {
    id: 'tasks',
    label: 'Tasks and planning',
    items: [
      { href: '/tasks', label: 'My tasks', permission: 'task.read.own' },
      { href: '/projects', label: 'Projects', permission: 'task.read.all' },
      // Time tracking joins here at M4, the calendar view at M3 polish.
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    items: [
      { href: '/customers', label: 'Customers', permission: 'customer.read' },
      // Leads, pipeline and quotations join here in a later phase.
    ],
  },
  // Support arrives at M5: queues, tickets, canned replies.
  {
    id: 'setup',
    label: 'Setup',
    items: [
      { href: '/setup/products', label: 'Products', permission: 'customer.read' },
      { href: '/setup/users', label: 'Users', permission: 'user.read' },
      { href: '/setup/tenant', label: 'Tenant settings', permission: 'tenant.manage' },
      { href: '/setup/fields', label: 'Custom fields', permission: 'tenant.manage' },
      { href: '/setup/audit', label: 'Audit log', permission: 'audit.read' },
      { href: '/setup/tenants', label: 'Tenants', permission: 'tenant.create' },
    ],
  },
];

/** Groups the signed in person may actually open, with empty groups dropped entirely. */
export function visibleGroups(permissions: Permission[]): NavigationGroup[] {
  return GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || permissions.includes(item.permission)),
  })).filter((group) => group.items.length > 0);
}
