'use client';

import { toggleTimerWindow } from './floating-timer';

/**
 * The timer button in the header. It opens and closes the floating timer window, which holds the
 * running clock and today's timers (John, 28 Sep 2026); the dot says a timer is running even when
 * the window is closed.
 */
export function TimerTray({ running = false }: { running?: boolean }) {
  return (
    <button
      type="button"
      onClick={toggleTimerWindow}
      aria-label={running ? 'Timers (one is running)' : 'Timers'}
      data-tooltip="Timers"
      className="has-tooltip relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-ink-subtle)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
    >
      <ListIcon />
      {running ? (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1.5 h-2 w-2 animate-pulse rounded-full bg-[var(--color-status-alert)]"
        />
      ) : null}
    </button>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6.2 1.5h3.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M8 1.5v1.7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="m12.3 2.7 1 1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="9" r="5.3" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M8 6.3v2.7l2 1.6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
