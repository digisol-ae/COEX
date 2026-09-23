'use client';

import { startTimerAction } from '@/app/(app)/time/actions';

/**
 * Start the timer straight from wherever the task is shown, not only from its own page.
 *
 * Always just starts this task's timer; the backend already stops whatever else is running, and
 * the header's running timer is the one place that says which task is currently timed. A card does
 * not need to track that itself.
 */
export function CardTimerButton({ taskId }: { taskId: string }) {
  return (
    <form action={startTimerAction} onClick={(event) => event.stopPropagation()}>
      <input type="hidden" name="taskId" value={taskId} />
      <button
        type="submit"
        title="Start timer"
        aria-label="Start timer for this task"
        className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-ink-subtle)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-status-ok)]"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M2.2 1.6v6.8l5.6-3.4-5.6-3.4Z" fill="currentColor" />
        </svg>
      </button>
    </form>
  );
}
