'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { clsx } from 'clsx';
import { HOME, type NavigationGroup } from './navigation';
import {
  getCollapsedSnapshot,
  getServerSnapshot,
  subscribe,
  toggleCollapsed,
} from './collapsed-store';
import { SpaceTree } from './space-tree';

/**
 * The menu itself, shared by the panel and the phone drawer.
 *
 * One implementation rather than two, because a menu that exists twice drifts: a link gets added
 * to one and forgotten in the other, and only a user on a client site ever finds out.
 */
export function NavigationTree({
  groups,
  onNavigate,
  canManageTasks,
}: {
  groups: NavigationGroup[];
  onNavigate?: () => void;
  canManageTasks: boolean;
}) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribe, getCollapsedSnapshot, getServerSnapshot);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="space-y-4">
      <NavigationLink
        href={HOME.href}
        label={HOME.label}
        active={isActive(HOME.href)}
        onNavigate={onNavigate}
      />

      {groups.map((group) => {
        // The group holding the current page stays open whatever was collapsed before, so nobody
        // can lose the page they are looking at.
        const holdsCurrentPage = group.items.some((item) => isActive(item.href));
        const open = holdsCurrentPage || !collapsed.includes(group.id);

        return (
          <div key={group.id}>
            <button
              type="button"
              onClick={() => toggleCollapsed(group.id)}
              aria-expanded={open}
              className="flex w-full items-center justify-between rounded-[var(--radius-control)] px-2 py-1 text-[11px] font-semibold tracking-[0.06em] text-[var(--color-ink-subtle)] uppercase transition-colors hover:text-[var(--color-ink-muted)]"
            >
              {group.label}
              <Chevron open={open} />
            </button>

            {open ? (
              <div className="mt-0.5 space-y-0.5">
                {group.items.map((item) =>
                  // Spaces carries a tree of its own: folders, tasks, then subtasks, on expand.
                  item.href === '/spaces' ? (
                    <SpaceTree key={item.href} canManage={canManageTasks} />
                  ) : (
                    <NavigationLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      active={isActive(item.href)}
                      onNavigate={onNavigate}
                    />
                  ),
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

function NavigationLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        // The generous height is for thumbs: 44 pixels is the smallest target reliably hit on a
        // phone.
        'block rounded-[var(--radius-control)] px-2 py-2 text-[13px] transition-colors',
        active
          ? 'bg-[var(--color-surface-muted)] font-medium text-[var(--color-ink)]'
          : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]',
      )}
    >
      {label}
    </Link>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={clsx('transition-transform', open ? 'rotate-90' : 'rotate-0')}
    >
      <path
        d="M4.5 2.5L8 6l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
