'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

/**
 * The icon rail: dark, narrow, and labelled.
 *
 * Labels under the icons rather than tooltips alone. An icon set nobody has seen before is a
 * guessing game, and a new joiner should not have to hover over six shapes to find their tasks.
 * They cost eleven pixels of height and remove the guessing entirely.
 */

interface RailItem {
  href: string;
  label: string;
  icon: 'home' | 'tasks' | 'projects' | 'time' | 'customers' | 'settings';
  permission?: string;
}

const ITEMS: RailItem[] = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/tasks', label: 'Tasks', icon: 'tasks', permission: 'task.read.own' },
  { href: '/projects', label: 'Projects', icon: 'projects', permission: 'task.read.all' },
  { href: '/time', label: 'Time', icon: 'time', permission: 'task.read.own' },
  { href: '/customers', label: 'CRM', icon: 'customers', permission: 'customer.read' },
  { href: '/setup', label: 'Setup', icon: 'settings', permission: 'tenant.manage' },
];

export function IconRail({
  permissions,
  counts,
}: {
  permissions: string[];
  counts?: Partial<Record<string, number>>;
}) {
  const pathname = usePathname();

  const visible = ITEMS.filter((item) => !item.permission || permissions.includes(item.permission));

  return (
    <nav
      aria-label="Main"
      className="hidden w-16 shrink-0 flex-col items-center gap-0.5 bg-[image:var(--gradient-rail)] py-3 md:flex"
    >
      <Link
        href="/dashboard"
        aria-label="COEX home"
        className="mb-2 flex h-9 w-9 items-center justify-center rounded-[10px] bg-[image:var(--gradient-brand)] text-sm font-bold text-white"
      >
        C
      </Link>

      {visible.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const count = counts?.[item.href];

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'relative flex w-14 flex-col items-center gap-1 rounded-[10px] px-1 py-2 transition-colors',
              active
                ? 'bg-[var(--color-rail-raised)] text-[var(--color-rail-ink)]'
                : 'text-[var(--color-rail-ink-muted)] hover:bg-[var(--color-rail-raised)]/60 hover:text-[var(--color-rail-ink)]',
            )}
          >
            <Icon name={item.icon} />
            <span className="text-[10px] leading-none">{item.label}</span>

            {count ? (
              <span className="absolute top-1 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-brand-red)] px-1 text-[9px] font-medium text-white">
                {count > 99 ? '99+' : count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function Icon({ name }: { name: RailItem['icon'] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 18 18',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'home') {
    return (
      <svg {...common}>
        <path d="M2.5 7.5 9 2.5l6.5 5V15a.5.5 0 0 1-.5.5h-4v-5H7v5H3a.5.5 0 0 1-.5-.5z" />
      </svg>
    );
  }

  if (name === 'tasks') {
    return (
      <svg {...common}>
        <path d="M6.5 4.5h9M6.5 9h9M6.5 13.5h9M2.5 4.5l1 1 1.5-2M2.5 9l1 1 1.5-2M2.5 13.5l1 1 1.5-2" />
      </svg>
    );
  }

  if (name === 'projects') {
    return (
      <svg {...common}>
        <path d="M2.5 5.5A1.5 1.5 0 0 1 4 4h3l1.5 2H14a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 14 14H4a1.5 1.5 0 0 1-1.5-1.5z" />
      </svg>
    );
  }

  if (name === 'time') {
    return (
      <svg {...common}>
        <circle cx="9" cy="9" r="6.5" />
        <path d="M9 5.5V9l2.5 1.5" />
      </svg>
    );
  }

  if (name === 'customers') {
    return (
      <svg {...common}>
        <path d="M2.5 15v-1.5a3 3 0 0 1 3-3h3a3 3 0 0 1 3 3V15" />
        <circle cx="7" cy="6" r="2.5" />
        <path d="M12.5 15v-1.5a3 3 0 0 0-1.2-2.4M11.5 4a2.5 2.5 0 0 1 0 4" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="9" cy="9" r="2.5" />
      <path d="M14.5 9a5.5 5.5 0 0 0-.1-1l1.4-1.1-1.5-2.6-1.7.7a5.5 5.5 0 0 0-1.7-1L10.6 2H7.4l-.3 1.9a5.5 5.5 0 0 0-1.7 1l-1.7-.7-1.5 2.6L3.6 8a5.5 5.5 0 0 0 0 2l-1.4 1.1 1.5 2.6 1.7-.7a5.5 5.5 0 0 0 1.7 1l.3 1.9h3.2l.3-1.9a5.5 5.5 0 0 0 1.7-1l1.7.7 1.5-2.6L14.4 10z" />
    </svg>
  );
}
