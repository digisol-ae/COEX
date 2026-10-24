'use client';

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type PointerEvent,
  type KeyboardEvent,
} from 'react';
import { clsx } from 'clsx';
import { Card, CardSection, EmptyState } from '@/components/ui';
import {
  formatDateTime,
  parseDateTimeInput,
  TASK_TIME_ZONE,
  toDateTimeInput,
} from '@coex/shared/tasks/dates';
import { GANTT_DAY, scheduleRange, shiftedSchedule, validSchedule } from '@coex/shared/tasks/gantt';
import { formatMinutes } from '@coex/shared/time/week';
import type { TaskSummary } from '@/modules/tasks/services/task.service';
import { saveGanttScheduleAction } from './gantt-actions';

const ZOOMS = [
  { label: 'Week', width: 56 },
  { label: 'Month', width: 22 },
  { label: 'Quarter', width: 9 },
] as const;
const control =
  'rounded-[var(--radius-control)] border border-[var(--color-line)] px-2.5 py-1 text-xs disabled:opacity-50';
type Draft = {
  taskId: string;
  startAt: string;
  endAt: string;
  originalStart: string;
  originalEnd: string;
};
type Drag = {
  id: string;
  mode: 'move' | 'start' | 'end';
  x: number;
  scroll: number;
  startAt: string;
  endAt: string;
  originalStart: string;
  originalEnd: string;
  moved: boolean;
  dayWidth: number;
  snap: number;
};
type Undo = {
  taskId: string;
  beforeStart: string;
  beforeEnd: string;
  afterStart: string;
  afterEnd: string;
};

export function Gantt({
  tasks,
  spaceId,
  canManage,
  referenceNow,
  onOpen,
}: {
  tasks: TaskSummary[];
  spaceId: string;
  canManage: boolean;
  referenceNow: string;
  onOpen: (task: TaskSummary) => void;
}) {
  // One server snapshot is shared with hydration; the live clock starts only after hydration.
  const [now, setNow] = useState(referenceNow);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date().toISOString()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [zoom, setZoom] = useState<number | 'fit'>(22);
  const [columnWidth, setColumnWidth] = useState(240);
  const [available, setAvailable] = useState(0);
  const [snap, setSnap] = useState(GANTT_DAY);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [undo, setUndo] = useState<Undo | null>(null);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const divider = useRef<{ x: number; width: number } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => setAvailable(entries[0].contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scheduled = tasks
    .filter((t) => validSchedule(t.startAt, t.endAt))
    .sort((a, b) => new Date(a.startAt!).getTime() - new Date(b.startAt!).getTime());
  const unscheduled = tasks.filter((t) => !validSchedule(t.startAt, t.endAt));
  const range = scheduleRange(tasks, now);
  const labelWidth = available
    ? Math.min(columnWidth, Math.max(110, Math.floor(available * 0.5)))
    : columnWidth;
  const chartSpace = Math.max(1, (available || 800) - labelWidth - 2);
  const dayWidth = zoom === 'fit' ? chartSpace / range.days : zoom;
  const chartWidth = range.days * dayWidth;
  const offset = (value: string | Date) =>
    ((new Date(value).getTime() - range.start) / GANTT_DAY) * dayWidth;
  const tickStep = Math.max(1, Math.ceil(44 / dayWidth), Math.ceil(range.days / 800));
  const ticks = Array.from({ length: Math.ceil(range.days / tickStep) }, (_, i) => i * tickStep);
  const weekendBands: { left: number; width: number }[] = [];
  if (dayWidth >= 4 && range.days <= 5000)
    for (let i = 0; i < range.days; i++) {
      const date = new Date(range.start + i * GANTT_DAY);
      const weekday = new Intl.DateTimeFormat('en-GB', {
        timeZone: TASK_TIME_ZONE,
        weekday: 'short',
      }).format(date);
      if (weekday === 'Sat' || weekday === 'Sun')
        weekendBands.push({ left: i * dayWidth, width: dayWidth });
    }
  const draftValid = !!draft && validSchedule(draft.startAt, draft.endAt);
  const draftTask = draft ? tasks.find((t) => t.id === draft.taskId) : undefined;
  const axisBackground =
    dayWidth >= 4
      ? {
          backgroundImage: `repeating-linear-gradient(to right, var(--color-line) 0, var(--color-line) 1px, transparent 1px, transparent ${dayWidth}px)`,
        }
      : {};

  function beginDraft(task: TaskSummary) {
    if (!canManage || pending || task.isClosed) return null;
    if (draft && draft.taskId !== task.id) {
      setError('Save or discard the current preview before editing another task.');
      return null;
    }
    setError('');
    return (
      draft ?? {
        taskId: task.id,
        startAt: new Date(task.startAt!).toISOString(),
        endAt: new Date(task.endAt!).toISOString(),
        originalStart: new Date(task.startAt!).toISOString(),
        originalEnd: new Date(task.endAt!).toISOString(),
      }
    );
  }
  function startDrag(event: PointerEvent<HTMLElement>, task: TaskSummary, mode: Drag['mode']) {
    if (event.button !== 0) return;
    const initial = beginDraft(task);
    if (!initial || !validSchedule(initial.startAt, initial.endAt)) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      id: task.id,
      mode,
      x: event.clientX,
      scroll: scroller.current?.scrollLeft ?? 0,
      ...initial,
      dayWidth,
      snap,
      moved: false,
    };
  }
  function moveDrag(event: PointerEvent<HTMLElement>) {
    const active = drag.current;
    if (!active) return;
    const pixels = event.clientX - active.x + (scroller.current?.scrollLeft ?? 0) - active.scroll;
    if (Math.abs(pixels) < 3 && !active.moved) return;
    active.moved = true;
    const delta = Math.round(((pixels / active.dayWidth) * GANTT_DAY) / active.snap) * active.snap;
    try {
      setDraft({
        taskId: active.id,
        originalStart: active.originalStart,
        originalEnd: active.originalEnd,
        ...shiftedSchedule(active.startAt, active.endAt, delta, active.mode),
      });
    } catch {
      setError('The proposed date is outside the supported range.');
    }
  }
  function endDrag(event: PointerEvent<HTMLElement>) {
    if (drag.current?.moved) suppressClick.current = true;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function keyboard(
    event: KeyboardEvent<HTMLElement>,
    task: TaskSummary,
    mode: Drag['mode'] = 'move',
  ) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const initial = beginDraft(task);
    if (!initial || !validSchedule(initial.startAt, initial.endAt)) return;
    event.preventDefault();
    event.stopPropagation();
    const selected = event.altKey ? 'start' : event.shiftKey ? 'end' : mode;
    setDraft({
      ...initial,
      ...shiftedSchedule(
        initial.startAt,
        initial.endAt,
        (event.key === 'ArrowLeft' ? -1 : 1) * snap,
        selected,
      ),
    });
  }
  function save(isUndo = false) {
    if (pending || (isUndo && !undo)) return;
    const change = isUndo ? undo : null;
    if (!isUndo && (!draft || !draftValid)) return;
    const taskId = change?.taskId ?? draft!.taskId;
    const startAt = change?.beforeStart ?? draft!.startAt,
      endAt = change?.beforeEnd ?? draft!.endAt;
    const expectedStartAt = change?.afterStart ?? draft!.originalStart,
      expectedEndAt = change?.afterEnd ?? draft!.originalEnd;
    setError('');
    startTransition(async () => {
      try {
        const result = await saveGanttScheduleAction({
          id: taskId,
          spaceId,
          startAt,
          endAt,
          expectedStartAt,
          expectedEndAt,
        });
        if (!result.saved) {
          setError(result.error ?? 'Could not save dates.');
          return;
        }
        setUndo(
          isUndo
            ? null
            : {
                taskId,
                beforeStart: expectedStartAt,
                beforeEnd: expectedEndAt,
                afterStart: startAt,
                afterEnd: endAt,
              },
        );
        setDraft(null);
      } catch {
        setError('Could not confirm the save. Reload the chart before retrying.');
      }
    });
  }
  function changeDate(field: 'startAt' | 'endAt', value: string) {
    if (!draft) return;
    const instant = parseDateTimeInput(value);
    setDraft({ ...draft, [field]: instant?.toISOString() ?? '' });
  }
  function resizeColumn(event: PointerEvent<HTMLElement>) {
    if (!divider.current) return;
    setColumnWidth(
      Math.max(110, Math.min(500, divider.current.width + event.clientX - divider.current.x)),
    );
  }
  const pointerHandlers = {
    onPointerMove: moveDrag,
    onPointerUp: endDrag,
    onPointerCancel: (e: PointerEvent<HTMLElement>) => {
      drag.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId))
        e.currentTarget.releasePointerCapture(e.pointerId);
    },
  };

  return (
    <div className="min-w-0 space-y-4">
      <Card>
        <CardSection title={`Schedule · ${scheduled.length} scheduled`}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              className={control}
              onClick={() =>
                scroller.current?.scrollTo({
                  left: Math.max(0, offset(now) - chartSpace / 2),
                  behavior: 'smooth',
                })
              }
            >
              Today
            </button>
            {ZOOMS.map((option) => (
              <button
                key={option.label}
                className={clsx(
                  control,
                  zoom === option.width && 'bg-[var(--color-surface-muted)]',
                )}
                aria-pressed={zoom === option.width}
                onClick={() => setZoom(option.width)}
              >
                {option.label}
              </button>
            ))}
            <button
              className={clsx(control, zoom === 'fit' && 'bg-[var(--color-surface-muted)]')}
              aria-pressed={zoom === 'fit'}
              onClick={() => setZoom('fit')}
            >
              Fit
            </button>
            <label className="flex items-center gap-2 text-xs">
              Zoom
              <input
                aria-label="Gantt zoom"
                type="range"
                min="4"
                max="120"
                step="1"
                value={zoom === 'fit' ? Math.max(4, Math.min(120, dayWidth)) : zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
            </label>
            {canManage ? (
              <label className="ml-auto flex items-center gap-2 text-xs">
                Snap
                <select
                  className={control}
                  aria-label="Schedule snap"
                  value={snap}
                  disabled={pending}
                  onChange={(e) => setSnap(Number(e.target.value))}
                >
                  <option value={GANTT_DAY}>1 day</option>
                  <option value={3600000}>1 hour</option>
                  <option value={1800000}>30 minutes</option>
                </select>
              </label>
            ) : null}
          </div>
          <p className="mb-3 text-xs text-[var(--color-ink-muted)]">
            Dubai time · Weekends shaded · Click a task to open its details.
            {canManage
              ? ' Drag a bar to move it; drag its edges to resize. Preview changes, then Save.'
              : ''}
          </p>
          {error ? (
            <p role="alert" className="mb-3 text-sm text-[var(--color-status-alert)]">
              {error}
            </p>
          ) : null}
          {draft ? (
            <div className="mb-3 rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-surface-muted)] p-3">
              <p className="mb-2 text-sm font-medium">Date preview · {draftTask?.title}</p>
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-xs">
                  Start (Dubai)
                  <input
                    aria-label="Gantt start date"
                    className={`${control} mt-1 block bg-[var(--color-surface)]`}
                    type="datetime-local"
                    disabled={pending}
                    value={toDateTimeInput(draft.startAt)}
                    onChange={(e) => changeDate('startAt', e.target.value)}
                  />
                </label>
                <label className="text-xs">
                  End (Dubai)
                  <input
                    aria-label="Gantt end date"
                    className={`${control} mt-1 block bg-[var(--color-surface)]`}
                    type="datetime-local"
                    disabled={pending}
                    value={toDateTimeInput(draft.endAt)}
                    onChange={(e) => changeDate('endAt', e.target.value)}
                  />
                </label>
                <button
                  className={control}
                  disabled={pending || !draftValid}
                  onClick={() => save()}
                >
                  {pending ? 'Saving dates…' : 'Save dates'}
                </button>
                <button
                  className={control}
                  disabled={pending}
                  onClick={() => {
                    setDraft(null);
                    setError('');
                  }}
                >
                  Discard preview
                </button>
              </div>
              {!draftValid ? (
                <p className="mt-2 text-xs" role="alert">
                  Enter a start and an end after it.
                </p>
              ) : null}
              <p className="mt-2 text-xs" role="status">
                {pending ? 'Saving dates…' : 'Preview only — dates have not been saved.'}
              </p>
            </div>
          ) : undo ? (
            <div className="mb-3 flex items-center gap-3 text-xs" role="status">
              <span>Dates saved.</span>
              <button className={control} disabled={pending} onClick={() => save(true)}>
                Undo last save
              </button>
            </div>
          ) : null}
          {/* One viewport owns dates and rows: horizontal alignment cannot drift. */}
          <div
            ref={scroller}
            data-testid="gantt-scroll"
            className="relative max-h-[36rem] min-w-0 overflow-auto rounded-lg border border-[var(--color-line)]"
            style={{ scrollPaddingLeft: labelWidth }}
          >
            <div style={{ width: labelWidth + chartWidth, minWidth: '100%' }}>
              <div className="sticky top-0 z-30 flex h-10 bg-[var(--color-surface)]">
                <div
                  className="sticky left-0 z-40 flex shrink-0 items-center border-r border-b border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-xs font-semibold"
                  style={{ width: labelWidth }}
                >
                  Task / status
                  <div
                    role="separator"
                    aria-label="Task column width"
                    aria-orientation="vertical"
                    aria-valuemin={110}
                    aria-valuemax={500}
                    aria-valuenow={Math.round(labelWidth)}
                    tabIndex={0}
                    className="absolute top-0 right-0 bottom-0 w-3 cursor-col-resize touch-none border-r-2 border-[var(--color-line-strong)] focus-visible:outline-2"
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      divider.current = { x: e.clientX, width: labelWidth };
                    }}
                    onPointerMove={resizeColumn}
                    onPointerUp={(e) => {
                      divider.current = null;
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    }}
                    onPointerCancel={() => {
                      divider.current = null;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                        e.preventDefault();
                        setColumnWidth(
                          Math.max(
                            110,
                            Math.min(500, labelWidth + (e.key === 'ArrowLeft' ? -16 : 16)),
                          ),
                        );
                      }
                    }}
                  />
                </div>
                <div
                  className="relative shrink-0 overflow-hidden border-b border-[var(--color-line)]"
                  style={{ width: chartWidth, ...axisBackground }}
                >
                  {ticks.map((index) => (
                    <span
                      key={index}
                      className="absolute top-2 whitespace-nowrap pl-1 text-[10px] text-[var(--color-ink-subtle)]"
                      style={{ left: index * dayWidth }}
                    >
                      {new Intl.DateTimeFormat('en-GB', {
                        timeZone: TASK_TIME_ZONE,
                        day: 'numeric',
                        month: 'short',
                      }).format(new Date(range.start + index * GANTT_DAY))}
                    </span>
                  ))}
                </div>
              </div>
              {scheduled.length ? (
                scheduled.map((task) => {
                  const preview = draft?.taskId === task.id && draftValid ? draft : null;
                  const startAt = preview?.startAt ?? new Date(task.startAt!).toISOString(),
                    endAt = preview?.endAt ?? new Date(task.endAt!).toISOString();
                  const left = offset(startAt),
                    durationWidth =
                      ((Date.parse(endAt) - Date.parse(startAt)) / GANTT_DAY) * dayWidth;
                  const editable = canManage && !task.isClosed && !pending;
                  const description = `${task.title}, ${formatDateTime(startAt)} to ${formatDateTime(endAt)}, ${task.assigneeNames.join(', ') || 'Unassigned'}, ${task.status}`;
                  const overdue = !task.isClosed && Date.parse(endAt) < Date.parse(now);
                  return (
                    <div key={task.id} data-task-id={task.id} className="flex h-14">
                      <div
                        className="sticky left-0 z-20 flex shrink-0 items-center gap-1 border-r border-b border-[var(--color-line)] bg-[var(--color-surface)] px-3"
                        style={{ width: labelWidth }}
                      >
                        <button
                          className="min-w-0 flex-1 text-left"
                          title={description}
                          onClick={() => onOpen(task)}
                        >
                          <span className="block truncate text-xs font-medium">{task.title}</span>
                          <span
                            className={clsx(
                              'block truncate text-[10px]',
                              overdue
                                ? 'text-[var(--color-status-alert)]'
                                : 'text-[var(--color-ink-subtle)]',
                            )}
                          >
                            {task.status}
                            {overdue ? ' · overdue' : ''}
                            {task.estimateMinutes
                              ? ` · ${formatMinutes(task.estimateMinutes)} estimate`
                              : ''}
                          </span>
                        </button>
                        {editable ? (
                          <button
                            className="shrink-0 px-1 text-[10px] underline"
                            aria-label={`Adjust dates for ${task.title}`}
                            onClick={() => {
                              const initial = beginDraft(task);
                              if (initial) setDraft(initial);
                            }}
                          >
                            Dates
                          </button>
                        ) : null}
                      </div>
                      <div
                        className="relative shrink-0 overflow-hidden border-b border-[var(--color-line)]"
                        style={{ width: chartWidth, ...axisBackground }}
                      >
                        {weekendBands.map((band) => (
                          <span
                            key={band.left}
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-0 bg-[var(--color-surface-muted)]/60"
                            style={band}
                          />
                        ))}
                        <span
                          aria-hidden="true"
                          data-testid="gantt-today"
                          className="pointer-events-none absolute inset-y-0 z-10 w-px bg-[var(--color-status-alert)]/60"
                          style={{ left: offset(now) }}
                        />
                        <div
                          role="group"
                          aria-label={description}
                          className="absolute top-3 h-8"
                          style={{ left, width: Math.max(24, durationWidth) }}
                        >
                          <span
                            aria-hidden="true"
                            data-testid="gantt-duration"
                            className={clsx(
                              'pointer-events-none absolute top-1 h-6 rounded',
                              preview
                                ? 'bg-[var(--color-action)]'
                                : task.isClosed
                                  ? 'bg-[var(--color-person-1)]/35'
                                  : 'bg-[var(--color-person-1)]',
                            )}
                            style={{ width: Math.max(1, durationWidth) }}
                          />
                          <button
                            type="button"
                            aria-label={`Move ${description}`}
                            aria-describedby={canManage ? 'gantt-keyboard-help' : undefined}
                            title={description}
                            className={clsx(
                              'absolute inset-0 rounded focus-visible:outline-2 focus-visible:outline-offset-2',
                              editable
                                ? 'cursor-grab touch-none active:cursor-grabbing'
                                : 'cursor-pointer',
                            )}
                            onPointerDown={(e) => startDrag(e, task, 'move')}
                            {...pointerHandlers}
                            onKeyDown={(e) => keyboard(e, task)}
                            onClick={() => {
                              if (suppressClick.current) {
                                suppressClick.current = false;
                                return;
                              }
                              onOpen(task);
                            }}
                          />
                          {editable && durationWidth >= 24 ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  suppressClick.current = false;
                                }}
                                title="Resize start"
                                aria-label={`Resize start of ${task.title}`}
                                className="absolute -left-1 top-0 h-8 w-3 cursor-ew-resize touch-none rounded border-l-2 border-[var(--color-ink)]/50 focus-visible:outline-2"
                                onPointerDown={(e) => startDrag(e, task, 'start')}
                                {...pointerHandlers}
                                onKeyDown={(e) => keyboard(e, task, 'start')}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  suppressClick.current = false;
                                }}
                                title="Resize end"
                                aria-label={`Resize end of ${task.title}`}
                                className="absolute top-0 h-8 w-3 cursor-ew-resize touch-none rounded border-r-2 border-[var(--color-ink)]/50 focus-visible:outline-2"
                                style={{ left: durationWidth - 8 }}
                                onPointerDown={(e) => startDrag(e, task, 'end')}
                                {...pointerHandlers}
                                onKeyDown={(e) => keyboard(e, task, 'end')}
                              />
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="sticky left-0" style={{ maxWidth: available || 800 }}>
                  <EmptyState message="Nothing is scheduled yet. Add dates through a task's details; undated tasks are listed below." />
                </div>
              )}
            </div>
          </div>
          {canManage ? (
            <p id="gantt-keyboard-help" className="mt-3 text-xs text-[var(--color-ink-subtle)]">
              Keyboard: focus a bar, use arrows to move; Shift + arrows adjusts the end, Alt +
              arrows adjusts the start. Dates also gives exact time controls. Drag the Task divider
              to adjust its width.
            </p>
          ) : null}
        </CardSection>
      </Card>
      {unscheduled.length ? (
        <Card>
          <CardSection title={`Not scheduled · ${unscheduled.length}`}>
            <ul className="space-y-2">
              {unscheduled.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 text-sm">
                  <button
                    className="min-w-0 truncate text-left underline-offset-4 hover:underline"
                    onClick={() => onOpen(task)}
                  >
                    {task.number} · {task.title}
                  </button>
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
