'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { clsx } from 'clsx';
import { HOME, type NavigationGroup } from './navigation';
import { ProjectTree } from './project-tree';
import {
  getCollapsedSnapshot,
  getServerSnapshot,
  subscribe,
  toggleCollapsed,
} from './collapsed-store';

/**
 * The menu itself, shared by the dark sidebar and the phone drawer.
 *
 * One implementation rather than two, because a menu that exists twice drifts: a link gets added
 * to the sidebar and forgotten on the phone, and only a user on a client site ever finds out.
 */
export function NavigationTree({
  groups,
  onNavigate,
}: {
  groups: NavigationGroup[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribe, getCollapsedSnapshot, getServerSnapshot);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="space-y-5">
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
              className="flex w-full items-center justify-between rounded-[var(--radius-control)] px-3 py-1.5 text-[11px] font-medium tracking-[0.08em] text-[var(--color-rail-ink-muted)] uppercase transition-colors hover:text-[var(--color-rail-ink)]"
            >
              {group.label}
              <Chevron open={open} />
            </button>

            {open ? (
              <div className="mt-1 space-y-0.5">
                {group.items.map((item) =>
                  // Projects carries a tree of its own: tasks, then subtasks, loaded on expand.
                  item.href === '/projects' ? (
                    <ProjectTree key={item.href} />
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
        'relative block rounded-[var(--radius-control)] px-3 py-2.5 text-sm transition-colors',
        active
          ? 'bg-[var(--color-rail-raised)] font-medium text-[var(--color-rail-ink)]'
          : 'text-[var(--color-rail-ink-muted)] hover:bg-[var(--color-rail-raised)]/60 hover:text-[var(--color-rail-ink)]',
      )}
    >
      {active ? (
        // The one place brand red appears in navigation: a three pixel mark on the current page.
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[image:var(--gradient-brand)]"
        />
      ) : null}
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
