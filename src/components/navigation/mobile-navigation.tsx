'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { NavigationGroup } from './navigation';
import { NavigationTree } from './navigation-tree';

/**
 * Navigation on a phone.
 *
 * A drawer rather than a bottom bar, because the menu has four groups and will have six once
 * Support and Time arrive, which is more than a bottom bar carries honestly. It closes when a link
 * is followed, when the backdrop is tapped and when Escape is pressed, and the page behind it does
 * not scroll while it is open.
 */
export function MobileNavigation({ groups }: { groups: NavigationGroup[] }) {
  const [open, setOpen] = useState(false);

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
        aria-label="Open menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-line-strong)] text-[var(--color-ink-muted)]"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M2 4.5h14M2 9h14M2 13.5h14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[var(--color-brand-black)]/30"
          />

          <div className="relative flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-[image:var(--gradient-rail)] px-3 py-5">
            <div className="mb-6 flex items-center justify-between pl-2">
              <Image
                src="/brand/logo-long.png"
                alt="DigiSol"
                width={130}
                height={28}
                className="h-6 w-auto"
              />

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-rail-ink-muted)] hover:text-[var(--color-rail-ink)]"
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

            <NavigationTree groups={groups} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
