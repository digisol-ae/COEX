'use client';

import Link from 'next/link';
import { useState } from 'react';
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
 * Tasks with no dates are listed underneath rather than dropped, because a plan with invisible
 * work is worse than an incomplete one.
 */

const DAY = 24 * 60 * 60 * 1000;
const MINIMUM_DAYS = 14;

interface Scheduled {
  task: TaskSummary;
  startAt: Date;
  endAt: Date;
}

export function Gantt({ tasks }: { tasks: TaskSummary[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

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

  // The window covers every bar, rounded out to whole days, with a fortnight as the floor so two
  // tasks a day apart do not produce a chart two pixels wide.
  const earliest = startOfDay(new Date(Math.min(...scheduled.map((row) => row.startAt.getTime()))));
  const latest = startOfDay(new Date(Math.max(...scheduled.map((row) => row.endAt.getTime()))));

  const spanDays = Math.max(
    MINIMUM_DAYS,
    Math.ceil((latest.getTime() - earliest.getTime()) / DAY) + 1,
  );

  const ticks = Array.from({ length: spanDays }, (_, index) => {
    const date = new Date(earliest.getTime() + index * DAY);
    return { date, isWeekStart: date.getDay() === 1, isWeekend: [0, 6].includes(date.getDay()) };
  });

  const position = (date: Date) => ((date.getTime() - earliest.getTime()) / (spanDays * DAY)) * 100;

  const today = new Date();
  const todayPosition = position(today);

  return (
    <div className="space-y-4">
      <Card>
        <CardSection title={`Schedule · ${scheduled.length} scheduled`}>
          <div className="overflow-x-auto">
            <div className="min-w-[48rem]">
              <div className="flex">
                <div className="w-56 shrink-0" />

                <div className="relative flex-1 border-b border-[var(--color-line)] pb-1">
                  <div className="flex">
                    {ticks.map((tick) => (
                      <div
                        key={tick.date.toISOString()}
                        className="flex-1 text-center text-[10px] text-[var(--color-ink-subtle)]"
                      >
                        {tick.isWeekStart || spanDays <= 21
                          ? tick.date.toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: spanDays <= 21 ? undefined : 'short',
                            })
                          : ''}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative">
                {todayPosition >= 0 && todayPosition <= 100 ? (
                  <div
                    aria-hidden="true"
                    className="absolute top-0 bottom-0 z-10 w-px bg-[var(--color-status-alert)]/40"
                    style={{ left: `calc(14rem + ${todayPosition}% * (100% - 14rem) / 100%)` }}
                  />
                ) : null}

                {scheduled.map(({ task, startAt, endAt }) => {
                  const left = position(startAt);
                  const width = Math.max(1.5, position(endAt) - left);
                  const isHovered = hovered === task.id;

                  return (
                    <div key={task.id} className="flex items-center">
                      <div className="w-56 shrink-0 truncate py-1.5 pr-3">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="text-xs text-[var(--color-ink)] underline-offset-4 hover:underline"
                        >
                          {task.title}
                        </Link>
                      </div>

                      <div className="relative h-8 flex-1">
                        <div className="absolute inset-0 flex">
                          {ticks.map((tick) => (
                            <div
                              key={tick.date.toISOString()}
                              className={clsx(
                                'flex-1 border-r border-[var(--color-line)]',
                                tick.isWeekend && 'bg-[var(--color-surface-muted)]/60',
                              )}
                            />
                          ))}
                        </div>

                        <div
                          role="img"
                          aria-label={`${task.title}, ${formatDateTime(startAt)} to ${formatDateTime(
                            endAt,
                          )}`}
                          onMouseEnter={() => setHovered(task.id)}
                          onMouseLeave={() => setHovered(null)}
                          className={clsx(
                            'absolute top-1/2 h-5 -translate-y-1/2 rounded transition-opacity',
                            task.isClosed
                              ? 'bg-[var(--color-person-1)]/35'
                              : 'bg-[var(--color-person-1)]',
                          )}
                          style={{ left: `${left}%`, width: `${width}%` }}
                        />

                        {isHovered ? (
                          <div
                            className="absolute top-full left-0 z-20 mt-1 w-64 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-xs shadow-lg"
                            style={{ left: `${Math.min(left, 60)}%` }}
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

                      <div className="w-24 shrink-0 pl-3 text-right">
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
                    </div>
                  );
                })}
              </div>
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
