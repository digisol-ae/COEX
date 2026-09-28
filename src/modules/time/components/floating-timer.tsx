'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
} from 'react';
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
  // Set by a drag, so letting go over the clock or bubble does not also count as a click.
  const dragged = useRef(false);
  const panel = useRef<HTMLDivElement>(null);
  const now = useNow(Boolean(running));

  // The clock has nothing to show without a running timer, so it waits as the bubble instead.
  const mode = prefs.mode === 'clock' && !running ? 'mini' : prefs.mode;
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

  const position = drag ?? { right: prefs.right, bottom: prefs.bottom };

  // A place chosen for the small bubble can leave the taller full window partly off screen, as can
  // a smaller browser window later. Whenever the size changes, pull it back fully into view.
  useLayoutEffect(() => {
    const element = panel.current;
    if (!element) return;
    function keepOnScreen() {
      if (!element || start.current || window.innerWidth < 640) return;
      const { width, height } = element.getBoundingClientRect();
      const current = getSnapshot();
      const right = clamp(current.right, EDGE, window.innerWidth - width - EDGE);
      const bottom = clamp(current.bottom, EDGE, window.innerHeight - height - EDGE);
      if (right !== current.right || bottom !== current.bottom)
        updateTimerWindow({ right, bottom });
    }
    keepOnScreen();
    const observer = new ResizeObserver(keepOnScreen);
    observer.observe(element);
    window.addEventListener('resize', keepOnScreen);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', keepOnScreen);
    };
  }, [mode]);

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (window.innerWidth < 640) return;
    // Buttons inside the handle work as buttons, except the clock and bubble, which are the handle.
    if ((event.target as HTMLElement).closest('a, button:not([data-drag-handle])')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    start.current = { x: event.clientX, y: event.clientY, ...position };
    dragged.current = false;
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (!start.current || !panel.current) return;
    const { width, height } = panel.current.getBoundingClientRect();
    const distance =
      Math.abs(event.clientX - start.current.x) + Math.abs(event.clientY - start.current.y);
    if (distance < 4 && !dragged.current) return;
    dragged.current = true;
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

  /** Opens the full window, unless the pointer was just used to drag. */
  function openWindow() {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    updateTimerWindow({ mode: 'open' });
  }

  const handle = { onPointerDown, onPointerMove, onPointerUp };
  const href = (kind: 'task' | 'ticket', id: string) =>
    kind === 'task' ? `/tasks/${id}` : `/support/tickets/${id}`;

  return (
    <div
      ref={panel}
      role="dialog"
      aria-label="Timers"
      style={{ right: position.right, bottom: position.bottom }}
      className={clsx(
        'popup-glass-gradient fixed z-40 max-sm:!right-4 max-sm:!bottom-4',
        mode === 'open' && 'w-auto max-sm:left-4 sm:w-80',
        mode === 'clock' && 'rounded-2xl',
        mode === 'mini' && 'rounded-full',
        drag ? 'cursor-grabbing select-none' : '',
      )}
    >
      {mode === 'mini' ? (
        <button
          type="button"
          data-drag-handle
          {...handle}
          onClick={openWindow}
          aria-label={running ? 'Open timers (one is running)' : 'Open timers'}
          data-tooltip="Timers"
          className="has-tooltip relative flex h-12 w-12 cursor-grab items-center justify-center rounded-full text-[var(--color-ink-muted)] select-none hover:text-[var(--color-ink)]"
        >
          <StopwatchIcon />
          {running ? (
            <span
              aria-hidden="true"
              className="absolute top-2.5 right-2.5 h-2 w-2 animate-pulse rounded-full bg-[var(--color-status-alert)]"
            />
          ) : null}
        </button>
      ) : mode === 'clock' && running ? (
        <div className="group flex items-center gap-2 py-1.5 pr-1.5 pl-3.5">
          <span
            aria-hidden="true"
            className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-status-alert)]"
          />
          <button
            type="button"
            data-drag-handle
            {...handle}
            onClick={openWindow}
            aria-label={`Timer ${running.itemNumber}: open the timer window`}
            title={`${running.itemNumber} ${running.itemTitle}`}
            className="cursor-grab px-1 font-mono text-3xl leading-none font-semibold tracking-tight text-[var(--color-ink)] tabular-nums select-none"
            // The server and the browser draw the clock seconds apart, so it always differs.
            suppressHydrationWarning
          >
            {clock}
          </button>
          <div className="flex flex-col opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100">
            <RoundButton
              label="Open the full window"
              small
              onClick={() => updateTimerWindow({ mode: 'open' })}
            >
              <ExpandIcon />
            </RoundButton>
            <RoundButton label="Minimize" small onClick={() => updateTimerWindow({ mode: 'mini' })}>
              <FoldIcon />
            </RoundButton>
          </div>
        </div>
      ) : (
        <div className="p-3">
          <div
            className="flex cursor-grab items-center justify-between gap-2 pb-2 select-none"
            {...handle}
          >
            <p className="text-xs font-semibold tracking-wide text-[var(--color-ink-muted)] uppercase">
              Timers
            </p>
            <div className="flex items-center gap-0.5">
              {running ? (
                <RoundButton
                  label="Shrink to a clock"
                  onClick={() => updateTimerWindow({ mode: 'clock' })}
                >
                  <ClockIcon />
                </RoundButton>
              ) : null}
              <RoundButton label="Minimize" onClick={() => updateTimerWindow({ mode: 'mini' })}>
                <FoldIcon />
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
                      plainTooltip
                      tone="stop"
                      onClick={() => stop(timer.entryId)}
                      disabled={busyId !== null}
                    >
                      <StopIcon />
                    </RoundButton>
                  ) : (
                    <RoundButton
                      label={`Resume the timer for ${timer.itemTitle}`}
                      plainTooltip
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

/** Opens the window, or minimizes it when it is open, for the timer button in the header. */
export function toggleTimerWindow(): void {
  updateTimerWindow({ mode: getSnapshot().mode === 'open' ? 'mini' : 'open' });
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
  small,
  plainTooltip,
  children,
}: {
  label: string;
  small?: boolean;
  /** The browser's own tooltip, for buttons inside the scrolling list, which would clip ours. */
  plainTooltip?: boolean;
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
      title={plainTooltip ? label : undefined}
      data-tooltip={plainTooltip ? undefined : label}
      className={clsx(
        !plainTooltip && 'has-tooltip',
        'flex shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40',
        small ? 'h-5 w-5' : 'h-7 w-7',
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

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 4.3V7l1.8 1.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M7 2.5h2.5V5M5 9.5H2.5V7M9.5 2.5 6.8 5.2M2.5 9.5l2.7-2.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StopwatchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 2.5h4M10 2.5v2M10 8v3l2 1.3M15.2 5.3l1 1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
