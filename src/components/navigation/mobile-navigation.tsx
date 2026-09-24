'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { NavigationGroup } from './navigation';
import { NavigationTree } from './navigation-tree';
import { SUPPORT_HREF, useLiveUnreadCount } from './unread-count';

/**
 * Navigation on a phone.
 *
 * A drawer rather than a bottom bar, because the menu has four groups and will have six once
 * Support and Time arrive, which is more than a bottom bar carries honestly. It closes when a link
 * is followed, when the backdrop is tapped and when Escape is pressed, and the page behind it does
 * not scroll while it is open.
 */
export function MobileNavigation({
  groups,
  canManageTasks,
  unreadTickets,
}: {
  groups: NavigationGroup[];
  canManageTasks: boolean;
  /** Undefined for someone who cannot read tickets. */
  unreadTickets?: number;
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
                className="absolute inset-0 bg-[var(--color-brand-black)]/30"
              />

              <div className="navigation-dark relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto px-3 py-5">
                <div className="mb-6 flex items-center justify-between pl-2">
                  <Image
                    src="/brand/logo-long.png"
                    alt="DigiSol"
                    width={148}
                    height={50}
                    className="h-[50px] w-auto"
                  />

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M4 4l8 8M12 4l-8 8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>

                <NavigationTree
                  groups={groups}
                  canManageTasks={canManageTasks}
                  onNavigate={() => setOpen(false)}
                  counts={unread ? { [SUPPORT_HREF]: unread } : undefined}
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
