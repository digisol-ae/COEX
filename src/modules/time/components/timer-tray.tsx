'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { startTimerAction, stopTimerAction } from '@/app/(app)/time/actions';

interface TodayTimer {
  entryId: string;
  taskId: string;
  taskNumber: string;
  taskTitle: string;
  minutes: number;
  running: boolean;
}

/**
 * Every timer started today, in one place, so switching between tasks through the day does not
 * mean losing track of what else is still owed a resume.
 *
 * Stopping the running one, or resuming a stopped one, both fetch a fresh list afterward rather
 * than trusting the click alone, because starting a timer always stops whatever else is running,
 * so more than this one row can change from a single click.
 */
export function TimerTray() {
  const [open, setOpen] = useState(false);
  const [timers, setTimers] = useState<TodayTimer[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const holder = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);

    try {
      const response = await fetch('/api/time/today');
      const data = (await response.json()) as { timers?: TodayTimer[] };
      setTimers(data.timers ?? []);
    } catch {
      setTimers([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) await load();
  }

  async function stop(entryId: string) {
    setBusyId(entryId);
    await stopTimerAction();
    await load();
    setBusyId(null);
  }

  async function resume(entryId: string, taskId: string) {
    setBusyId(entryId);
    const data = new FormData();
    data.set('taskId', taskId);
    await startTimerAction(data);
    await load();
    setBusyId(null);
  }

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (holder.current && !holder.current.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={holder} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label="Today's timers"
        title="Today's timers"
        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-ink-subtle)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
      >
        <ListIcon />
      </button>

      {open ? (
        <div className="absolute top-full right-0 z-40 mt-1 w-72 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2 shadow-[var(--shadow-pop)]">
          <p className="px-1.5 pb-1.5 text-xs font-medium tracking-wide text-[var(--color-ink-subtle)] uppercase">
            Today&apos;s timers
          </p>

          {loading && timers === null ? (
            <p className="px-1.5 py-2 text-sm text-[var(--color-ink-subtle)]">Loading</p>
          ) : timers && timers.length === 0 ? (
            <p className="px-1.5 py-2 text-sm text-[var(--color-ink-subtle)]">
              Nothing timed yet today.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {(timers ?? []).map((timer) => (
                <li
                  key={timer.entryId}
                  className="flex items-center gap-2 rounded-[var(--radius-control)] px-1.5 py-1.5 hover:bg-[var(--color-surface-muted)]"
                >
                  {timer.running ? (
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-status-alert)]"
                    />
                  ) : (
                    <span className="w-1.5 shrink-0" />
                  )}

                  <Link
                    href={`/tasks/${timer.taskId}`}
                    onClick={() => setOpen(false)}
                    className="min-w-0 flex-1 truncate text-sm text-[var(--color-ink)] hover:underline"
                    title={`${timer.taskNumber} ${timer.taskTitle}`}
                  >
                    {timer.taskTitle}
                  </Link>

                  <span className="shrink-0 text-xs text-[var(--color-ink-subtle)] tabular-nums">
                    {Math.floor(timer.minutes / 60)}:{String(timer.minutes % 60).padStart(2, '0')}
                  </span>

                  {timer.running ? (
                    <button
                      type="button"
                      onClick={() => stop(timer.entryId)}
                      disabled={busyId === timer.entryId}
                      title="Stop"
                      aria-label={`Stop the timer for ${timer.taskTitle}`}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-status-alert)] transition-colors hover:bg-[var(--color-status-alert-soft)] disabled:opacity-50"
                    >
                      <StopIcon />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => resume(timer.entryId, timer.taskId)}
                      disabled={busyId === timer.entryId}
                      title="Resume"
                      aria-label={`Resume the timer for ${timer.taskTitle}`}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-status-ok)] transition-colors hover:bg-[var(--color-status-ok-soft)] disabled:opacity-50"
                    >
                      <PlayIcon />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2.5 4h11M2.5 8h11M2.5 12h7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="8" height="8" rx="1" fill="currentColor" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" aria-hidden="true">
      <path d="M1.8 0.8v7.4l6-3.7-6-3.7Z" fill="currentColor" />
    </svg>
  );
}
