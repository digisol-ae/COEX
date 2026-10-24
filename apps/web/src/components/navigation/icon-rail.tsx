'use client';

import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { DeskIcon } from '@/components/ui/desk-icon';
import { usePathname, useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import { isRailActive } from './rail-active';
import { SUPPORT_HREF, useLiveUnreadCount } from './unread-count';

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
  icon: 'home' | 'desk' | 'tasks' | 'spaces' | 'support' | 'time' | 'customers' | 'settings';
  permission?: string;
  /** The sidebar group it belongs to, so the rail follows the person's own menu order. */
  group?: string;
}

const ITEMS: RailItem[] = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/my-desk', label: 'My desk', icon: 'desk', permission: 'task.read.own' },
  { href: '/tasks', label: 'Tasks', icon: 'tasks', permission: 'task.read.own', group: 'tasks' },
  {
    href: '/spaces',
    label: 'Spaces',
    icon: 'spaces',
    permission: 'task.read.all',
    group: 'tasks',
  },
  {
    href: '/support/tickets',
    label: 'Support',
    icon: 'support',
    permission: 'ticket.read.own',
    group: 'support',
  },
  { href: '/time', label: 'Time', icon: 'time', permission: 'task.read.own', group: 'time' },
  {
    href: '/customers',
    label: 'CRM',
    icon: 'customers',
    permission: 'customer.read',
    group: 'crm',
  },
  { href: '/setup', label: 'Setup', icon: 'settings', permission: 'tenant.manage', group: 'setup' },
];

/**
 * The rail's links, shared by the desktop rail and the phone drawer so the two cannot drift. The
 * caller supplies the surrounding column.
 */
export function RailLinks({
  permissions,
  counts,
  groupOrder = [],
  onNavigate,
}: {
  permissions: string[];
  counts?: Partial<Record<string, number>>;
  /** Group ids in the person's order; Home stays first whatever it says. */
  groupOrder?: string[];
  /** The phone drawer closes itself when a link is followed. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ''}`;
  const supportCount = useLiveUnreadCount(
    counts?.[SUPPORT_HREF],
    permissions.includes('ticket.read.own'),
  );

  const rank = (item: RailItem) => {
    if (!item.group) return -1;
    const index = groupOrder.indexOf(item.group);
    return index === -1 ? groupOrder.length : index;
  };
  // A stable sort keeps Tasks, Spaces and Time together in their usual order within their group.
  const visible = ITEMS.filter(
    (item) => !item.permission || permissions.includes(item.permission),
  ).sort((a, b) => rank(a) - rank(b));

  return (
    <>
      {visible.map((item) => {
        const active = isRailActive(pathname, item.href, item.group);
        // The CRM icon carries the contracts that need renewing, since Contracts lives in that group.
        const renewals = item.group === 'crm' ? counts?.['/contracts'] : undefined;
        const count = item.href === SUPPORT_HREF ? supportCount : (renewals ?? counts?.[item.href]);

        return (
          <Link
            key={item.href}
            href={
              item.href === '/setup'
                ? `/setup?${new URLSearchParams({ returnTo })}`
                : item.href === '/tasks'
                  ? '/tasks?mine=1'
                  : renewals
                    ? '/contracts?filter=due'
                    : item.href
            }
            onClick={onNavigate}
            title={
              item.href === '/tasks'
                ? `${count ?? 0} open task${count === 1 ? '' : 's'} assigned to you — click to view`
                : renewals
                  ? `${renewals} contract${renewals === 1 ? '' : 's'} expiring or ended — click to view`
                  : item.label
            }
            aria-current={active ? 'page' : undefined}
            className={clsx(
              // On a phone the icons are taller, so a thumb lands on one rather than its neighbour.
              'relative flex w-14 flex-col items-center gap-1 rounded-[10px] px-1 py-2 transition-colors max-md:py-3',
              active
                ? 'rail-glow'
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
    </>
  );
}

export function IconRail({
  permissions,
  counts,
  groupOrder = [],
}: {
  permissions: string[];
  counts?: Partial<Record<string, number>>;
  groupOrder?: string[];
}) {
  return (
    <nav
      aria-label="Main"
      className="hidden w-16 shrink-0 flex-col items-center gap-0.5 bg-[image:var(--gradient-rail)] py-3 md:flex"
    >
      <Link
        href="/dashboard"
        aria-label="Worktello home"
        className="mb-2 flex h-9 w-9 items-center justify-center rounded-[10px] text-sm font-bold text-white"
      >
        <BrandLogo mark className="h-9 w-9" />
      </Link>

      <RailLinks permissions={permissions} counts={counts} groupOrder={groupOrder} />
    </nav>
  );
}

function Icon({ name }: { name: RailItem['icon'] }) {
  if (name === 'desk') return <DeskIcon />;

  return (
    <span
      aria-hidden="true"
      className="inline-block h-[18px] w-[18px] shrink-0 bg-current"
      style={{
        maskImage: `url(/brand/${name}-icon.png)`,
        maskSize: 'contain',
        maskPosition: 'center',
        maskRepeat: 'no-repeat',
        WebkitMaskImage: `url(/brand/${name}-icon.png)`,
        WebkitMaskSize: 'contain',
        WebkitMaskPosition: 'center',
        WebkitMaskRepeat: 'no-repeat',
      }}
    />
  );
}
