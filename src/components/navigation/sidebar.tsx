'use client';

import Image from 'next/image';
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

/**
 * Collapsible sidebar.
 *
 * The group holding the current page is always open, whatever was collapsed before, so nobody can
 * lose the page they are on. Everything else remembers its state in this browser, which is a
 * convenience rather than data: if it is missing the sidebar simply opens every group.
 */

export function Sidebar({ groups }: { groups: NavigationGroup[] }) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribe, getCollapsedSnapshot, getServerSnapshot);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="hidden w-60 shrink-0 border-r border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-6 md:block">
      <Image
        src="/brand/logo-long.png"
        alt="DigiSol"
        width={150}
        height={32}
        priority
        className="mb-8 ml-2 h-7 w-auto"
      />

      <nav className="space-y-4">
        <NavigationLink href={HOME.href} label={HOME.label} active={isActive(HOME.href)} />

        {groups.map((group) => {
          const holdsCurrentPage = group.items.some((item) => isActive(item.href));
          const open = holdsCurrentPage || !collapsed.includes(group.id);

          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => toggleCollapsed(group.id)}
                aria-expanded={open}
                className="flex w-full items-center justify-between rounded-[var(--radius-control)] px-3 py-1.5 text-xs font-medium tracking-wide text-[var(--color-ink-subtle)] uppercase transition-colors hover:text-[var(--color-ink-muted)]"
              >
                {group.label}
                <Chevron open={open} />
              </button>

              {open ? (
                <div className="mt-0.5 space-y-0.5">
                  {group.items.map((item) => (
                    <NavigationLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      active={isActive(item.href)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function NavigationLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'block rounded-[var(--radius-control)] px-3 py-2 text-sm transition-colors',
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
