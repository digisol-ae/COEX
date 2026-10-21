'use client';
import { useSyncExternalStore, type ReactNode } from 'react';
import {
  subscribe,
  getCollapsedSnapshot,
  getServerSnapshot,
  toggleCollapsed,
} from './collapsed-store';
const KEY = '__sidebar';
export function SidebarFrame({ children }: { children: ReactNode }) {
  const hidden = useSyncExternalStore(subscribe, getCollapsedSnapshot, getServerSnapshot).includes(
    KEY,
  );
  return (
    <div id="desktop-sidebar" className={hidden ? 'hidden' : 'hidden shrink-0 md:flex'}>
      {children}
    </div>
  );
}
export function SidebarToggle() {
  const hidden = useSyncExternalStore(subscribe, getCollapsedSnapshot, getServerSnapshot).includes(
    KEY,
  );
  return (
    <button
      type="button"
      aria-label={hidden ? 'Expand sidebar' : 'Collapse sidebar'}
      title={hidden ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-expanded={!hidden}
      aria-controls="desktop-sidebar"
      onClick={() => toggleCollapsed(KEY)}
      className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-sunken)] md:flex"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
        {hidden ? <path d="m13 9 3 3-3 3" /> : <path d="m16 9-3 3 3 3" />}
      </svg>
    </button>
  );
}
