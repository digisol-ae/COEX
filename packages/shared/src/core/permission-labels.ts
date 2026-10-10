import type { Permission } from './permissions';

/**
 * How the raw `module.action` permission strings read to an admin who has never seen the code.
 *
 * Grouped to match the sidebar's own groups (`navigation.ts`) wherever a group exists, so "what
 * this person can see" in the editor lines up with "what this person actually sees" in the app,
 * rather than being a second, disconnected vocabulary an admin has to learn.
 */
export const PERMISSION_GROUPS: {
  label: string;
  permissions: { id: Permission; label: string }[];
}[] = [
  {
    label: 'Tasks and planning',
    permissions: [
      { id: 'task.read.own', label: 'View own tasks and timesheet' },
      { id: 'task.read.all', label: 'View every space and task' },
      { id: 'timesheet.read.all', label: "View everyone's timesheets and the time report" },
      { id: 'task.manage', label: 'Create and edit tasks, spaces and folders' },
      { id: 'desk.read.all', label: "View everyone's My Desk performance history" },
    ],
  },
  {
    label: 'CRM',
    permissions: [
      { id: 'customer.read', label: 'View customers' },
      { id: 'customer.manage', label: 'Create and edit customers' },
      { id: 'products.read', label: 'View products' },
      { id: 'products.manage', label: 'Create and edit products' },
      { id: 'lead.read', label: 'View own leads' },
      { id: 'lead.read.all', label: 'View every lead' },
      { id: 'lead.manage', label: 'Create and edit leads, convert or disqualify them' },
      { id: 'opportunity.read', label: 'View own opportunities' },
      { id: 'opportunity.read.all', label: 'View every opportunity' },
      {
        id: 'opportunity.manage',
        label: 'Create and edit opportunities, move them through the pipeline',
      },
      {
        id: 'pipeline.manage',
        label: 'Edit pipeline stages and lost reasons, reopen won or lost deals',
      },
    ],
  },
  {
    label: 'Support',
    permissions: [
      { id: 'ticket.read.own', label: 'View own tickets' },
      { id: 'ticket.read.all', label: 'View every ticket and the desk report' },
      { id: 'ticket.manage', label: 'Create and edit tickets, queues and saved replies' },
    ],
  },
  {
    label: 'Security',
    permissions: [
      { id: 'user.read', label: 'View the user list' },
      { id: 'user.manage', label: 'Manage users, roles and access' },
      { id: 'audit.read', label: 'View the audit log' },
    ],
  },
  {
    label: 'Tenant',
    permissions: [
      { id: 'tenant.read', label: 'View tenant settings' },
      { id: 'tenant.manage', label: 'Change tenant settings' },
      { id: 'tenant.create', label: 'Create new tenants (platform administrators)' },
    ],
  },
];
