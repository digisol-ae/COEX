'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { NavigationGroup } from './navigation';
import { NavigationTree } from './navigation-tree';
import { RailLinks } from './icon-rail';
import { QuickSearch } from './quick-search';
import { SUPPORT_HREF, useLiveUnreadCount } from './unread-count';

/**
 * Navigation on a phone.
 *
 * A drawer rather than a bottom bar, because the menu has four groups and will have six once
 * Support and Time arrive, which is more than a bottom bar carries honestly. It is the desktop
 * menu in a narrower frame (John, 16 Oct 2026): the same dark rail beside the same light panel, the
 * same glow and the same menu, so nothing looks different on a phone, only sized for a thumb. It
 * closes when a link is followed, when the backdrop is tapped and when Escape is pressed, and the
 * page behind it does not scroll while it is open.
 */
export function MobileNavigation({
  groups,
  canManageTasks,
  permissions,
  tenantName,
  counts,
  unreadTickets,
  renewalsDue,
}: {
  groups: NavigationGroup[];
  canManageTasks: boolean;
  permissions: string[];
  tenantName: string;
  /** The rail's badges, keyed by href, as the desktop rail receives them. */
  counts?: Partial<Record<string, number>>;
  /** Undefined for someone who cannot read tickets. */
  unreadTickets?: number;
  /** Contracts expiring or ended; undefined for someone who cannot read contracts. */
  renewalsDue?: number;
}) {
  const [open, setOpen] = useState(false);
  const unread = useLiveUnreadCount(unreadTickets, unreadTickets !== undefined);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread ? `Open menu, ${unread} tickets with something new` : 'Open menu'}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-line-strong)] text-[var(--color-ink-muted)]"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M2 4.5h14M2 9h14M2 13.5h14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        {/* The rail is hidden on a phone, so the menu button carries the Support number instead. */}
        {unread ? (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-brand-red)] px-1 text-[9px] font-medium text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      {/* Portalled to <body>: the header's backdrop blur makes it the containing block for any
          fixed child, which would squeeze the drawer into the header strip on a phone. */}
      {open
        ? createPortal(
            <div className="fixed inset-0 z-50 flex md:hidden">
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="popup-backdrop absolute inset-0"
              />

              <div className="relative flex h-full w-[min(92vw,22rem)] shadow-[var(--shadow-pop)]">
                <nav
                  aria-label="Main"
                  className="flex w-16 shrink-0 flex-col items-center gap-0.5 overflow-y-auto bg-[image:var(--gradient-rail)] pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                >
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    aria-label="COEX home"
                    className="mb-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[image:var(--gradient-brand)] text-sm font-bold text-white"
                  >
                    C
                  </Link>
                  <RailLinks
                    permissions={permissions}
                    counts={counts}
                    groupOrder={groups.map((group) => group.id)}
                    onNavigate={() => setOpen(false)}
                  />
                </nav>

                <div className="sidebar-glow flex min-w-0 flex-1 flex-col overflow-y-auto border-r border-[var(--color-line)] pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                  <div className="flex items-center justify-between gap-2 px-4 pb-2">
                    <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                      {tenantName}
                    </p>

                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Close menu"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M4 4l8 8M12 4l-8 8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* The header's search is hidden on a phone, so it lives here instead. */}
                  <div className="px-3 pb-3">
                    <QuickSearch />
                  </div>

                  <div className="px-2">
                    <NavigationTree
                      groups={groups}
                      canManageTasks={canManageTasks}
                      onNavigate={() => setOpen(false)}
                      counts={{
                        ...counts,
                        // The polled Support number, so it moves while the drawer is open.
                        ...(unread ? { [SUPPORT_HREF]: unread } : {}),
                        '/contracts': renewalsDue,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
