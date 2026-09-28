'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from 'react';
import { clsx } from 'clsx';
import {
  startTicketTimerAction,
  startTimerAction,
  stopTimerAction,
} from '@/app/(app)/time/actions';
import { getServerSnapshot, getSnapshot, subscribe, updateTimerWindow } from './timer-window-store';

interface TodayTimer {
  entryId: string;
  kind: 'task' | 'ticket';
  itemId: string;
  itemNumber: string;
  itemTitle: string;
  minutes: number;
  running: boolean;
}

export interface RunningTimerInfo {
  kind: 'task' | 'ticket';
  itemId: string;
  itemNumber: string;
  itemTitle: string;
  startedAt: string;
}

const EDGE = 8;

/**
 * The timer in a small floating window of pastel glass (John, 28 Sep 2026): the running clock with
 * its stop button, and every timer from today with stop and resume. It stays where it was dragged
 * as the pages change, folds to a pill showing only the clock, and on a phone sits along the
 * bottom of the screen. The list is fetched fresh after every stop or resume, because starting one
 * timer stops whatever else was running.
 */
export function FloatingTimer({ running }: { running: RunningTimerInfo | null }) {
  const router = useRouter();
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [timers, setTimers] = useState<TodayTimer[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [drag, setDrag] = useState<{ right: number; bottom: number } | null>(null);
  const start = useRef<{ x: number; y: number; right: number; bottom: number } | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const now = useNow(Boolean(running));

  const mode = prefs.mode === 'pill' && !running ? 'closed' : prefs.mode;
  const runningKey = running ? `${running.itemId}:${running.startedAt}` : 'none';

  useEffect(() => {
    if (mode !== 'open') return;
    let live = true;
    fetch('/api/time/today')
      .then((response) => response.json() as Promise<{ timers?: TodayTimer[] }>)
      .then((data) => {
        if (live) setTimers(data.timers ?? []);
      })
      .catch(() => {
        if (live) setTimers([]);
      });
    return () => {
      live = false;
    };
  }, [mode, runningKey, version]);

  if (mode === 'closed') return null;

  const position = drag ?? { right: prefs.right, bottom: prefs.bottom };

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (window.innerWidth < 640 || (event.target as HTMLElement).closest('button, a')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { x: event.clientX, y: event.clientY, ...position };
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (!start.current || !panel.current) return;
    const { width, height } = panel.current.getBoundingClientRect();
    setDrag({
      right: clamp(
        start.current.right - (event.clientX - start.current.x),
        EDGE,
        window.innerWidth - width - EDGE,
      ),
      bottom: clamp(
        start.current.bottom - (event.clientY - start.current.y),
        EDGE,
        window.innerHeight - height - EDGE,
      ),
    });
  }

  function onPointerUp() {
    if (start.current && drag) updateTimerWindow(drag);
    start.current = null;
    setDrag(null);
  }

  async function act(entryId: string, work: () => Promise<unknown>) {
    setBusyId(entryId);
    await work();
    router.refresh();
    setBusyId(null);
    setVersion((value) => value + 1);
  }

  function stop(entryId: string) {
    return act(entryId, () => stopTimerAction());
  }

  function resume(timer: TodayTimer) {
    const data = new FormData();
    data.set(timer.kind === 'task' ? 'taskId' : 'ticketId', timer.itemId);
    return act(timer.entryId, () =>
      timer.kind === 'task' ? startTimerAction(data) : startTicketTimerAction(data),
    );
  }

  const clock = running ? elapsed(running.startedAt, now) : null;
  const href = (kind: 'task' | 'ticket', id: string) =>
    kind === 'task' ? `/tasks/${id}` : `/support/tickets/${id}`;

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label="Timers"
      style={{ right: position.right, bottom: position.bottom }}
      className={clsx(
        'popup-glass-gradient fixed z-40 max-sm:!right-4 max-sm:!bottom-4 max-sm:left-4',
        mode === 'pill' ? 'rounded-full px-1.5 py-1.5 sm:w-auto' : 'w-auto sm:w-80',
        drag ? 'cursor-grabbing select-none' : '',
      )}
    >
      {mode === 'pill' && running ? (
        <div
          className="flex cursor-grab items-center gap-2 pl-2 select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <span
            aria-hidden="true"
            className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-status-alert)]"
          />
          <button
            type="button"
            onClick={() => updateTimerWindow({ mode: 'open' })}
            className="min-w-0 text-left"
            aria-label="Open the timer window"
          >
            {/* The server and the browser draw the clock seconds apart, so it always differs. */}
            <span
              className="font-semibold tabular-nums text-[var(--color-ink)]"
              suppressHydrationWarning
            >
              {clock}
            </span>
            <span className="ml-2 hidden max-w-40 truncate align-bottom text-xs text-[var(--color-ink-muted)] sm:inline-block">
              {running.itemTitle}
            </span>
          </button>
          <RoundButton
            label="Stop timer"
            tone="stop"
            onClick={() => stop('running')}
            disabled={busyId !== null}
          >
            <StopIcon />
          </RoundButton>
        </div>
      ) : (
        <div className="p-3">
          <div
            className="flex cursor-grab items-center justify-between gap-2 pb-2 select-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <p className="text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
              Timers
            </p>
            <div className="flex items-center gap-0.5">
              {running ? (
                <RoundButton
                  label="Fold to the clock"
                  onClick={() => updateTimerWindow({ mode: 'pill' })}
                >
                  <FoldIcon />
                </RoundButton>
              ) : null}
              <RoundButton label="Close" onClick={() => updateTimerWindow({ mode: 'closed' })}>
                <CloseIcon />
              </RoundButton>
            </div>
          </div>

          {running ? (
            <div className="mb-3 rounded-2xl bg-[var(--color-surface)]/60 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-status-alert)]"
                />
                <Link
                  href={href(running.kind, running.itemId)}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-ink)] hover:underline"
                  title={`${running.itemNumber} ${running.itemTitle}`}
                >
                  {running.itemTitle}
                </Link>
              </div>
              <div className="mt-1 flex items-end justify-between">
                <span className="font-mono text-[11px] text-[var(--color-ink-subtle)]">
                  {running.itemNumber}
                </span>
                <span
                  className="text-2xl font-semibold tabular-nums text-[var(--color-ink)]"
                  suppressHydrationWarning
                >
                  {clock}
                </span>
                <RoundButton
                  label="Stop timer"
                  tone="stop"
                  onClick={() => stop('running')}
                  disabled={busyId !== null}
                >
                  <StopIcon />
                </RoundButton>
              </div>
            </div>
          ) : (
            <p className="mb-2 text-sm text-[var(--color-ink-muted)]">No timer running.</p>
          )}

          <p className="px-1 pb-1 text-[11px] tracking-wide text-[var(--color-ink-subtle)] uppercase">
            Today
          </p>
          {timers === null ? (
            <p className="px-1 py-1 text-sm text-[var(--color-ink-subtle)]">Loading…</p>
          ) : timers.length === 0 ? (
            <p className="px-1 py-1 text-sm text-[var(--color-ink-subtle)]">
              Nothing timed yet today.
            </p>
          ) : (
            <ul className="max-h-60 space-y-0.5 overflow-x-hidden overflow-y-auto">
              {timers.map((timer) => (
                <li
                  key={timer.entryId}
                  className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-[var(--color-surface)]/60"
                >
                  <span className="w-7 shrink-0 text-[10px] tracking-wide text-[var(--color-ink-subtle)] uppercase">
                    {timer.kind === 'task' ? 'Task' : 'Tkt'}
                  </span>
                  <Link
                    href={href(timer.kind, timer.itemId)}
                    className="min-w-0 flex-1 truncate text-sm text-[var(--color-ink)] hover:underline"
                    title={`${timer.itemNumber} ${timer.itemTitle}`}
                  >
                    {timer.itemTitle}
                  </Link>
                  <span className="shrink-0 text-xs text-[var(--color-ink-subtle)] tabular-nums">
                    {Math.floor(timer.minutes / 60)}:{String(timer.minutes % 60).padStart(2, '0')}
                  </span>
                  {timer.running ? (
                    <RoundButton
                      label={`Stop the timer for ${timer.itemTitle}`}
                      tone="stop"
                      onClick={() => stop(timer.entryId)}
                      disabled={busyId !== null}
                    >
                      <StopIcon />
                    </RoundButton>
                  ) : (
                    <RoundButton
                      label={`Resume the timer for ${timer.itemTitle}`}
                      tone="go"
                      onClick={() => resume(timer)}
                      disabled={busyId !== null}
                    >
                      <PlayIcon />
                    </RoundButton>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Opens or closes the window, for the timer button in the header. */
export function toggleTimerWindow(): void {
  updateTimerWindow({ mode: getSnapshot().mode === 'open' ? 'closed' : 'open' });
}

function useNow(ticking: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!ticking) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [ticking]);
  return now;
}

function elapsed(startedAt: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), Math.max(low, high));
}

function RoundButton({
  label,
  tone,
  onClick,
  disabled,
  children,
}: {
  label: string;
  tone?: 'stop' | 'go';
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-tooltip={label}
      className={clsx(
        'has-tooltip flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40',
        tone === 'stop'
          ? 'text-[var(--color-status-alert)] hover:bg-[var(--color-status-alert-soft)]'
          : tone === 'go'
            ? 'text-[var(--color-status-ok)] hover:bg-[var(--color-status-ok-soft)]'
            : 'text-[var(--color-ink-subtle)] hover:bg-[var(--color-surface)]/60 hover:text-[var(--color-ink)]',
      )}
    >
      {children}
    </button>
  );
}

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <rect x="2" y="2" width="8" height="8" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3.5 2.2v7.6L10 6z" fill="currentColor" />
    </svg>
  );
}

function FoldIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="m3 3 6 6M9 3 3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
