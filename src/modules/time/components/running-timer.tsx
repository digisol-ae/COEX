'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { stopTimerAction } from '@/app/(app)/time/actions';

/**
 * The running timer, shown in the header on every screen.
 *
 * It counts up in the browser from the start time rather than polling the server, which costs
 * nothing and keeps the number honest. A timer running past midnight is called out, because the
 * usual cause is someone forgetting to stop it and a fourteen hour entry helps nobody.
 */
export function RunningTimer({
  taskId,
  taskNumber,
  taskTitle,
  startedAt,
}: {
  taskId: string;
  taskNumber: string;
  taskTitle: string;
  startedAt: string;
}) {
  const start = new Date(startedAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const startedOnAnotherDay = new Date(startedAt).toDateString() !== new Date(now).toDateString();

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/tasks/${taskId}`}
        title={`${taskNumber} ${taskTitle}`}
        className="flex items-center gap-2 rounded-full bg-[var(--color-surface-muted)] px-3 py-1.5 text-sm text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-sunken)]"
      >
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 rounded-full bg-[var(--color-status-alert)]"
        />
        <span className="tabular-nums">
          {hours}:{String(minutes).padStart(2, '0')}
        </span>
        <span className="hidden max-w-32 truncate sm:inline">{taskTitle}</span>
      </Link>

      {startedOnAnotherDay ? (
        <span
          title="This timer has been running since yesterday"
          className="rounded-full bg-[var(--color-status-warn-soft)] px-2 py-0.5 text-xs text-[var(--color-status-warn)]"
        >
          since yesterday
        </span>
      ) : null}

      <form action={stopTimerAction}>
        <button
          type="submit"
          title="Stop timer"
          aria-label="Stop timer"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-ink-subtle)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="2.5" y="2.5" width="9" height="9" rx="1.5" fill="currentColor" />
          </svg>
        </button>
      </form>
    </div>
  );
}
