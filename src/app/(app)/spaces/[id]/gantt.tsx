'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Card, CardSection, EmptyState } from '@/components/ui';
import { formatDateTime } from '@/modules/tasks/dates';
import { formatMinutes } from '@/modules/time/week';
import type { TaskSummary } from '@/modules/tasks/services/task.service';

/**
 * The schedule as bars across a date axis.
 *
 * One hue for every bar, on purpose. A Gantt is a single series, tasks, plotted over time: giving
 * each task its own colour would spend the only free channel on information the chart already
 * shows by position, and eight colours down the page reads as noise.
 *
 * State is carried by a word beside the bar rather than by colour alone, so it survives a
 * colourblind reader, a black and white print and a screen reader. Red appears only on genuinely
 * late work, which is the same rule the rest of the product follows.
 *
 * Zoom changes how wide a day is, not which tasks are shown, and the chart scrolls sideways.
 * A quarter squeezed into one screen hides the detail that makes a Gantt worth opening, and a
 * fortnight stretched across it wastes the screen; the choice belongs to whoever is reading.
 *
 * Tasks with no dates are listed underneath rather than dropped, because a plan with invisible
 * work is worse than an incomplete one.
 */

const DAY = 24 * 60 * 60 * 1000;
const MINIMUM_DAYS = 14;

/** Pixels per day. Fit is computed from the span so the whole plan lands on one screen. */
const ZOOMS = [
  { id: 'week', label: 'Week', dayWidth: 56 },
  { id: 'month', label: 'Month', dayWidth: 22 },
  { id: 'quarter', label: 'Quarter', dayWidth: 9 },
  { id: 'fit', label: 'Fit', dayWidth: 0 },
] as const;

type ZoomId = (typeof ZOOMS)[number]['id'];

interface Scheduled {
  task: TaskSummary;
  startAt: Date;
  endAt: Date;
}

export function Gantt({ tasks }: { tasks: TaskSummary[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [zoom, setZoom] = useState<ZoomId>('month');
  const scroller = useRef<HTMLDivElement>(null);

  const scheduled: Scheduled[] = tasks
    .filter((task) => task.startAt && task.endAt)
    .map((task) => ({
      task,
      startAt: new Date(task.startAt as unknown as string),
      endAt: new Date(task.endAt as unknown as string),
    }))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  const unscheduled = tasks.filter((task) => !task.startAt || !task.endAt);

  if (scheduled.length === 0) {
    return (
      <Card>
        <EmptyState message="Nothing is scheduled yet. Give a task a start and an end to see it here." />
      </Card>
    );
  }

  // The window covers every bar and today, rounded out to whole days, with a fortnight as the
  // floor so two tasks a day apart do not produce a chart two pixels wide.
  const now = new Date();

  const earliest = startOfDay(
    new Date(Math.min(now.getTime(), ...scheduled.map((row) => row.startAt.getTime()))),
  );
  const latest = startOfDay(
    new Date(Math.max(now.getTime(), ...scheduled.map((row) => row.endAt.getTime()))),
  );

  const spanDays = Math.max(
    MINIMUM_DAYS,
    Math.ceil((latest.getTime() - earliest.getTime()) / DAY) + 1,
  );

  const chosen = ZOOMS.find((option) => option.id === zoom) ?? ZOOMS[1];
  const dayWidth =
    chosen.dayWidth || Math.max(6, Math.min(56, Math.round(880 / Math.max(spanDays, 1))));

  const chartWidth = spanDays * dayWidth;
  const labelDensity = Math.max(1, Math.ceil(34 / dayWidth));

  const ticks = Array.from({ length: spanDays }, (_, index) => {
    const date = new Date(earliest.getTime() + index * DAY);

    return {
      date,
      index,
      isWeekStart: date.getDay() === 1,
      isWeekend: [0, 6].includes(date.getDay()),
      isMonthStart: date.getDate() === 1,
    };
  });

  const offsetOf = (date: Date) => ((date.getTime() - earliest.getTime()) / DAY) * dayWidth;

  const todayOffset = offsetOf(now);

  function scrollToToday() {
    const element = scroller.current;
    if (!element) return;

    element.scrollTo({
      left: Math.max(0, todayOffset - element.clientWidth / 3),
      behavior: 'smooth',
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardSection title={`Schedule · ${scheduled.length} scheduled`}>
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={scrollToToday}
              className="rounded-[var(--radius-control)] border border-[var(--color-line)] px-2.5 py-1 text-[12px] text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
            >
              Today
            </button>

            <div className="ml-auto flex items-center gap-0.5 rounded-[var(--radius-control)] border border-[var(--color-line)] p-0.5">
              {ZOOMS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={zoom === option.id}
                  onClick={() => setZoom(option.id)}
                  className={clsx(
                    'rounded px-2 py-0.5 text-[12px] transition-colors',
                    zoom === option.id
                      ? 'bg-[var(--color-surface-muted)] text-[var(--color-ink)]'
                      : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex">
            <div className="w-40 shrink-0 sm:w-56" />

            <div ref={scroller} className="flex-1 overflow-x-auto">
              <div style={{ width: chartWidth }}>
                <div className="flex border-b border-[var(--color-line)] pb-1">
                  {ticks.map((tick) => (
                    <div
                      key={tick.date.toISOString()}
                      style={{ width: dayWidth }}
                      className="shrink-0 text-center text-[10px] whitespace-nowrap text-[var(--color-ink-subtle)]"
                    >
                      {tick.index % labelDensity === 0
                        ? tick.date.toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: dayWidth >= 40 ? undefined : 'short',
                          })
                        : ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex">
            <div className="w-40 shrink-0 sm:w-56">
              {scheduled.map(({ task }) => (
                <div key={task.id} className="flex h-8 items-center truncate pr-3">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="truncate text-xs text-[var(--color-ink)] underline-offset-4 hover:underline"
                  >
                    {task.title}
                  </Link>
                </div>
              ))}
            </div>

            <div
              className="flex-1 overflow-x-auto"
              onScroll={(event) => {
                // The header scrolls with the bars, so the dates above a bar stay above it.
                if (scroller.current) scroller.current.scrollLeft = event.currentTarget.scrollLeft;
              }}
            >
              <div className="relative" style={{ width: chartWidth }}>
                <div aria-hidden="true" className="absolute inset-0 flex">
                  {ticks.map((tick) => (
                    <div
                      key={tick.date.toISOString()}
                      style={{ width: dayWidth }}
                      className={clsx(
                        'shrink-0',
                        tick.isMonthStart || tick.isWeekStart
                          ? 'border-r border-[var(--color-line-strong)]'
                          : 'border-r border-[var(--color-line)]',
                        tick.isWeekend && 'bg-[var(--color-surface-muted)]/60',
                      )}
                    />
                  ))}
                </div>

                <div
                  aria-hidden="true"
                  className="absolute top-0 bottom-0 z-10 w-px bg-[var(--color-status-alert)]/50"
                  style={{ left: todayOffset }}
                />

                {scheduled.map(({ task, startAt, endAt }) => {
                  const left = offsetOf(startAt);
                  const width = Math.max(6, offsetOf(endAt) - left);
                  const isHovered = hovered === task.id;

                  return (
                    <div key={task.id} className="relative h-8">
                      <div
                        role="img"
                        aria-label={`${task.title}, ${formatDateTime(startAt)} to ${formatDateTime(
                          endAt,
                        )}`}
                        onMouseEnter={() => setHovered(task.id)}
                        onMouseLeave={() => setHovered(null)}
                        className={clsx(
                          'absolute top-1/2 h-5 -translate-y-1/2 rounded',
                          task.isClosed
                            ? 'bg-[var(--color-person-1)]/35'
                            : 'bg-[var(--color-person-1)]',
                        )}
                        style={{ left, width }}
                      />

                      {isHovered ? (
                        <div
                          className="absolute top-full z-20 mt-1 w-64 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-xs shadow-[var(--shadow-pop)]"
                          style={{ left }}
                        >
                          <p className="font-medium text-[var(--color-ink)]">{task.title}</p>
                          <p className="mt-1 text-[var(--color-ink-muted)]">
                            {formatDateTime(startAt)} to {formatDateTime(endAt)}
                          </p>
                          {task.plannedMinutes ? (
                            <p className="text-[var(--color-ink-muted)]">
                              {formatMinutes(task.plannedMinutes)} planned
                            </p>
                          ) : null}
                          <p className="text-[var(--color-ink-muted)]">
                            {task.assigneeNames.join(', ') || 'Unassigned'} · {task.status}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="w-20 shrink-0 pl-3">
              {scheduled.map(({ task }) => (
                <div key={task.id} className="flex h-8 items-center justify-end">
                  {task.isOverdue ? (
                    <span className="text-[10px] font-medium text-[var(--color-status-alert)]">
                      overdue
                    </span>
                  ) : task.isClosed ? (
                    <span className="text-[10px] text-[var(--color-ink-subtle)]">done</span>
                  ) : (
                    <span className="text-[10px] text-[var(--color-ink-subtle)]">
                      {task.plannedMinutes ? formatMinutes(task.plannedMinutes) : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <p className="mt-3 text-xs text-[var(--color-ink-subtle)]">
            The vertical line marks today. Weekends are shaded. Faded bars are finished work. The
            List view carries the same data as a table.
          </p>
        </CardSection>
      </Card>

      {unscheduled.length > 0 ? (
        <Card>
          <CardSection title={`Not scheduled · ${unscheduled.length}`}>
            <ul className="space-y-1.5">
              {unscheduled.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="truncate text-[var(--color-ink)] underline-offset-4 hover:underline"
                  >
                    <span className="font-mono text-xs text-[var(--color-ink-subtle)]">
                      {task.number}
                    </span>{' '}
                    {task.title}
                  </Link>
                  <span className="shrink-0 text-xs text-[var(--color-ink-subtle)]">
                    {task.status}
                  </span>
                </li>
              ))}
            </ul>
          </CardSection>
        </Card>
      ) : null}
    </div>
  );
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}
