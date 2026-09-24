import type { Permission } from '@/modules/core/permissions';

/**
 * The shape of the product, expressed as menus.
 *
 * Groups are named after the part of the business they serve rather than after the module that
 * happens to implement them, because the people using COEX think in terms of their work. New
 * modules add a group here and nothing else: the sidebar, the permission filtering and the expand
 * state all follow from this one list.
 *
 * Two placements are deliberate. Products sits in CRM because it is commercial data people look up
 * while talking to a customer, not configuration. Users and the audit log sit in Security because
 * access control and the record of who did what are what an ADHICS style review asks to see, and
 * they belong beside the session and sign in controls that join them later.
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
      { href: '/spaces', label: 'Spaces', permission: 'task.read.all' },
      { href: '/time', label: 'Timesheet', permission: 'task.read.own' },
      { href: '/time/all', label: 'All timesheets', permission: 'task.read.all' },
      { href: '/time/report', label: 'Time report', permission: 'task.read.all' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    items: [
      { href: '/customers', label: 'Customers', permission: 'customer.read' },
      { href: '/products', label: 'Products', permission: 'products.read' },
      // Leads, pipeline and quotations join here in a later phase.
    ],
  },
  {
    id: 'support',
    label: 'Support',
    items: [
      { href: '/support/tickets', label: 'Tickets', permission: 'ticket.read.own' },
      { href: '/support/metrics', label: 'Desk report', permission: 'ticket.read.all' },
      // Channels join here at M6: email threading and WhatsApp through XVERSE.
    ],
  },
  {
    id: 'security',
    label: 'Security',
    items: [
      { href: '/security/users', label: 'Users and roles', permission: 'user.manage' },
      { href: '/security/audit', label: 'Audit log', permission: 'audit.read' },
      // Active sessions and the sign in policy join here with Entra.
    ],
  },
  {
    id: 'setup',
    label: 'Setup',
    items: [
      { href: '/setup/queues', label: 'Queues', permission: 'tenant.manage' },
      { href: '/setup/email', label: 'Email', permission: 'tenant.manage' },
      { href: '/setup/canned-replies', label: 'Saved replies', permission: 'ticket.manage' },
      { href: '/setup/tenant', label: 'Tenant settings', permission: 'tenant.manage' },
      { href: '/setup/fields', label: 'Custom fields', permission: 'tenant.manage' },
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
