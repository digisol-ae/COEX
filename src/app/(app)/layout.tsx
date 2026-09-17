import Image from 'next/image';
import Link from 'next/link';
import { requireUser } from '@/lib/session';
import { logoutAction } from '../login/actions';
import type { Permission } from '@/modules/core/permissions';

/**
 * Shell for every signed in screen.
 *
 * Navigation separates daily work from configuration. Everything a person touches every day sits
 * at the top; anything set once and rarely revisited lives under Setup, which keeps the sidebar
 * short and stops a new joiner from wandering into tenant settings while looking for their tasks.
 */

interface NavigationItem {
  href: string;
  label: string;
  permission?: Permission;
}

const WORK: NavigationItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/tasks', label: 'Tasks', permission: 'task.read.own' },
  { href: '/projects', label: 'Projects', permission: 'task.read.all' },
  { href: '/customers', label: 'Customers', permission: 'customer.read' },
];

const SETUP: NavigationItem[] = [
  { href: '/setup/products', label: 'Products', permission: 'customer.read' },
  { href: '/setup/users', label: 'Users', permission: 'user.read' },
  { href: '/setup/tenant', label: 'Tenant settings', permission: 'tenant.manage' },
  { href: '/setup/fields', label: 'Custom fields', permission: 'tenant.manage' },
  { href: '/setup/audit', label: 'Audit log', permission: 'audit.read' },
  { href: '/setup/tenants', label: 'Tenants', permission: 'tenant.create' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const allowed = (items: NavigationItem[]) =>
    items.filter((item) => !item.permission || user.permissions.includes(item.permission));

  const work = allowed(WORK);
  const setup = allowed(SETUP);

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

        <nav className="space-y-6">
          <NavigationGroup items={work} />

          {setup.length > 0 ? <NavigationGroup title="Setup" items={setup} /> : null}
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

function NavigationGroup({ title, items }: { title?: string; items: NavigationItem[] }) {
  return (
    <div>
      {title ? (
        <p className="mb-1 px-3 text-xs font-medium tracking-wide text-[var(--color-ink-subtle)] uppercase">
          {title}
        </p>
      ) : null}

      <div className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-[var(--radius-control)] px-3 py-2 text-sm text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
