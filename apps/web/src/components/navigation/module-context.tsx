'use client';

import { usePathname } from 'next/navigation';

const PAGES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/my-desk': 'My desk',
  '/personal': 'Personal tasks',
  '/tasks': 'Tasks',
  '/support/tickets': 'Tickets',
  '/support/metrics': 'Desk report',
  '/customers': 'Customers',
  '/products': 'Products',
  '/leads': 'Leads',
  '/contracts': 'Contracts',
  '/opportunities': 'Opportunities',
  '/spaces': 'Spaces',
  '/time': 'My timesheet',
  '/time/all': 'All timesheets',
  '/time/report': 'Time report',
  '/time/activity': 'Team activity',
  '/profile': 'Profile',
  '/menu-order': 'Menu order',
  '/security/users': 'Users and roles',
  '/security/audit': 'Audit log',
  '/setup/tutorials': 'Setup · Tutorials',
  '/setup': 'Setup',
  '/setup/queues': 'Setup · Queues',
  '/setup/email': 'Setup · Email',
  '/setup/whats-new': 'Setup · What’s New Management',
  '/setup/pipeline': 'Setup · Pipeline',
  '/setup/whatsapp': 'Setup · WhatsApp',
  '/setup/canned-replies': 'Setup · Saved replies',
  '/setup/tenant': 'Setup · Tenant settings',
  '/setup/fields': 'Setup · Custom fields',
  '/setup/tenants': 'Setup · Tenants',
};
const RECORDS: Record<string, string> = {
  tasks: 'Task',
  customers: 'Customer',
  products: 'Product',
  leads: 'Lead',
  contracts: 'Contract',
  opportunities: 'Opportunity',
  spaces: 'Space',
};

/** Always-visible page context, independent of record titles and collapsed/mobile navigation. */
export function ModuleContext() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const label =
    PAGES[pathname] ??
    (segments[0] === 'support' && segments[1] === 'tickets'
      ? 'Ticket'
      : (RECORDS[segments[0]] ?? PAGES[`/${segments[0]}`]));
  if (!label) return null;
  return (
    <p
      aria-label="Current module"
      className="mb-2 text-xs font-semibold tracking-wide text-[var(--color-ink-muted)]"
    >
      {label}
    </p>
  );
}
