'use client';

import { startTimerAction, stopTimerAction } from '@/app/(app)/time/actions';

/**
 * Start or stop the timer straight from wherever the task is shown, not only from its own page.
 *
 * Whether this button starts or stops depends on `running`, whether this specific task is the one
 * currently being timed, passed down from the page (the header's running timer is the single
 * source of truth for that). The accumulated total beside it sums every segment logged against the
 * task so far, today's stop-and-restart cycles included, plus the live elapsed time while it is the
 * one running; it is not reset by pausing and resuming.
 */
export function CardTimerButton({
  taskId,
  running,
  loggedMinutes,
}: {
  taskId: string;
  running: boolean;
  loggedMinutes: number;
}) {
  const showTime = running || loggedMinutes > 0;

  return (
    <span className="inline-flex items-center gap-1">
      <form
        action={running ? stopTimerAction : startTimerAction}
        onClick={(event) => event.stopPropagation()}
      >
        {running ? null : <input type="hidden" name="taskId" value={taskId} />}
        <button
          type="submit"
          title={running ? 'Stop timer' : 'Start timer'}
          aria-label={running ? 'Stop the timer for this task' : 'Start timer for this task'}
          className={
            running
              ? 'flex h-4 w-4 items-center justify-center rounded-full text-[var(--color-status-alert)] transition-colors hover:bg-[var(--color-status-alert-soft)]'
              : 'flex h-4 w-4 items-center justify-center rounded-full text-[var(--color-ink-subtle)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-status-ok)]'
          }
        >
          {running ? <PauseIcon /> : <PlayIcon />}
        </button>
      </form>

      {showTime ? (
        <span
          title={running ? 'Running, plus time already logged today' : 'Time already logged'}
          className={
            running
              ? 'text-[11px] tabular-nums text-[var(--color-status-alert)]'
              : 'text-[11px] tabular-nums text-[var(--color-ink-subtle)]'
          }
        >
          {Math.floor(loggedMinutes / 60)}:{String(loggedMinutes % 60).padStart(2, '0')}
        </span>
      ) : null}
    </span>
  );
}

function PlayIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
      <path d="M1.6 1.2v5.6l4.8-2.8-4.8-2.8Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="2.6" height="7" rx="0.5" fill="currentColor" />
      <rect x="4.9" y="0.5" width="2.6" height="7" rx="0.5" fill="currentColor" />
    </svg>
  );
}
