import Image from 'next/image';
import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { logoutAction } from '../login/actions';

/**
 * Shell for every signed in screen. Navigation is deliberately short: modules are added to it as
 * they are built, rather than showing links to screens that do not exist yet.
 */

const NAVIGATION = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/customers', label: 'Customers', permission: 'customer.read' as const },
  { href: '/products', label: 'Products', permission: 'customer.read' as const },
  { href: '/admin/users', label: 'Users', permission: 'user.read' as const },
  { href: '/admin/tenant', label: 'Tenant settings', permission: 'tenant.manage' as const },
  { href: '/admin/audit', label: 'Audit log', permission: 'audit.read' as const },
  { href: '/admin/tenants', label: 'Tenants', permission: 'tenant.create' as const },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const visible = NAVIGATION.filter(
    (item) => !item.permission || user.permissions.includes(item.permission),
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-6 md:block">
        <Image
          src="/brand/logo-long.png"
          alt="DigiSol"
          width={150}
          height={32}
          priority
          className="mb-8 h-7 w-auto"
        />

        <nav className="space-y-1">
          {visible.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-[var(--radius-control)] px-3 py-2 text-sm text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--color-ink)]">{user.tenantName}</p>
            <p className="text-xs text-[var(--color-ink-subtle)]">
              {user.name} · {user.role.replace('_', ' ')}
            </p>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-[var(--radius-control)] border border-[var(--color-line-strong)] px-3 py-1.5 text-sm text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
            >
              Sign out
            </button>
          </form>
        </header>

        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
