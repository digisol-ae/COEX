import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { Card, PageHeader } from '@/components/ui';
import type { Permission } from '@/modules/core/permissions';

export const metadata = { title: 'Setup · COEX' };

/** A landing page for configuration, so Setup is a place rather than only a menu heading. */
const SECTIONS: { href: string; label: string; description: string; permission: Permission }[] = [
  {
    href: '/setup/products',
    label: 'Products',
    description: 'What DigiSol sells and supports. Everything else prices from this list.',
    permission: 'customer.read',
  },
  {
    href: '/setup/users',
    label: 'Users',
    description: 'Who can sign in, their role, and suspending an account immediately.',
    permission: 'user.read',
  },
  {
    href: '/setup/tenant',
    label: 'Tenant settings',
    description: 'Name, timezone, currency, numbering prefixes and attachment retention.',
    permission: 'tenant.manage',
  },
  {
    href: '/setup/fields',
    label: 'Custom fields',
    description: 'Extra fields on your records, defined without a code change.',
    permission: 'tenant.manage',
  },
  {
    href: '/setup/audit',
    label: 'Audit log',
    description: 'Append only record of every change, with who made it and when.',
    permission: 'audit.read',
  },
  {
    href: '/setup/tenants',
    label: 'Tenants',
    description: 'Every company on the platform. Platform administrators only.',
    permission: 'tenant.create',
  },
];

export default async function SetupPage() {
  const user = await requireUser();
  const sections = SECTIONS.filter((section) => user.permissions.includes(section.permission));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Setup"
        description="Configuration that is set once and rarely revisited, kept out of the way of daily work."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full px-5 py-4 transition-colors hover:bg-[var(--color-surface-muted)]">
              <h2 className="font-medium text-[var(--color-ink)]">{section.label}</h2>
              <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{section.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
