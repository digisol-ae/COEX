'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from 'clsx';
import { Avatar } from '@/components/ui/avatar';
import { PriorityFlag } from '@/components/ui/pill';
import { toDateTimeInput } from '@/modules/tasks/dates';

/**
 * Setting a date, a priority or an owner without opening the task.
 *
 * Planning a week means touching twenty tasks, and a round trip through a full form for each one
 * is why people give up and keep the plan in their head. These editors sit in the row and on the
 * card: one click to open, one click to set, and the change goes straight to the server.
 *
 * They are ordinary buttons and menus rather than a drag surface, so the keyboard reaches all of
 * them and a phone can use them, which the board's dragging cannot promise.
 */

export type PriorityValue = 'urgent' | 'high' | 'normal' | 'low';

const PRIORITIES: { value: PriorityValue; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
];

/**
 * A small menu anchored to its trigger.
 *
 * It closes on Escape and on a click anywhere else, because a menu that only closes through its
 * own button is a menu people leave open by accident and then fight with.
 */
export function Popover({
  label,
  trigger,
  children,
  align = 'left',
  disabled,
  className,
}: {
  label: string;
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: 'left' | 'right';
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const holder = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  /**
   * The panel is rendered in a portal on the body with fixed positioning, not absolutely inside the
   * card. A card sits in a column that scrolls sideways and clips its overflow, and the next card
   * paints on top of this one, so an absolute menu is either clipped or hidden behind the card
   * below. Anchored to the body and measured against the viewport, it escapes both, and it flips
   * above the trigger when there is no room below, which is what a task at the foot of a column
   * needs.
   */
  const place = useCallback(() => {
    const trigger = holder.current?.getBoundingClientRect();
    const box = panel.current;
    if (!trigger || !box) return;

    const gap = 4;
    const margin = 8;
    const width = box.offsetWidth;
    const height = box.offsetHeight;

    let left = align === 'right' ? trigger.right - width : trigger.left;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));

    let top = trigger.bottom + gap;
    if (top + height > window.innerHeight - margin) {
      const above = trigger.top - height - gap;
      top = above >= margin ? above : Math.max(margin, window.innerHeight - height - margin);
    }

    setCoords({ top, left });
  }, [align]);

  useLayoutEffect(() => {
    if (open) place();
    else setCoords(null);
  }, [open, place]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (holder.current?.contains(target) || panel.current?.contains(target)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  if (disabled) return <span className={className}>{trigger}</span>;

  return (
    <span ref={holder} className={clsx('relative inline-flex', className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center rounded-[var(--radius-control)] px-1 py-0.5 transition-colors hover:bg-[var(--color-surface-muted)]"
      >
        {trigger}
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              id={panelId}
              ref={panel}
              style={{
                position: 'fixed',
                top: coords?.top ?? 0,
                left: coords?.left ?? 0,
                visibility: coords ? 'visible' : 'hidden',
              }}
              className="z-50 max-h-[min(20rem,80vh)] min-w-44 overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-pop)]"
            >
              {children(() => setOpen(false))}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

function MenuItem({
  onClick,
  selected,
  children,
}: {
  onClick: () => void;
  selected?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'flex w-full items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-left text-[13px] transition-colors',
        selected
          ? 'bg-[var(--color-surface-muted)] text-[var(--color-ink)]'
          : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]',
      )}
    >
      {children}
    </button>
  );
}

export function PriorityPicker({
  priority,
  onChange,
  disabled,
}: {
  priority: string;
  onChange: (value: PriorityValue) => void;
  disabled?: boolean;
}) {
  return (
    <Popover
      label="Set priority"
      disabled={disabled}
      trigger={<PriorityFlag priority={priority} />}
    >
      {(close) => (
        <>
          {PRIORITIES.map((option) => (
            <MenuItem
              key={option.value}
              selected={option.value === priority}
              onClick={() => {
                close();
                if (option.value !== priority) onChange(option.value);
              }}
            >
              <PriorityFlag priority={option.value} />
              {option.label}
            </MenuItem>
          ))}
        </>
      )}
    </Popover>
  );
}

/** Six in the evening on a given day: the end of a working day, which is what a deadline means. */
function endOfDay(offsetDays: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(18, 0, 0, 0);

  return toDateTimeInput(date);
}

export function SchedulePicker({
  startAt,
  endAt,
  onChange,
  disabled,
  trigger,
}: {
  startAt: Date | string | null;
  endAt: Date | string | null;
  onChange: (value: { startAt: string | null; endAt: string | null }) => void;
  disabled?: boolean;
  trigger: React.ReactNode;
}) {
  return (
    <Popover label="Set dates" align="right" disabled={disabled} trigger={trigger}>
      {(close) => (
        <div className="w-60 p-1.5">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                close();
                onChange({ startAt: toDateTimeInput(startAt), endAt: endOfDay(0) });
              }}
              className="flex-1 rounded-[var(--radius-control)] border border-[var(--color-line)] px-2 py-1 text-[12px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => {
                close();
                onChange({ startAt: toDateTimeInput(startAt), endAt: endOfDay(1) });
              }}
              className="flex-1 rounded-[var(--radius-control)] border border-[var(--color-line)] px-2 py-1 text-[12px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              Tomorrow
            </button>

            <button
              type="button"
              onClick={() => {
                close();
                onChange({ startAt: toDateTimeInput(startAt), endAt: endOfDay(7) });
              }}
              className="flex-1 rounded-[var(--radius-control)] border border-[var(--color-line)] px-2 py-1 text-[12px] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              Next week
            </button>
          </div>

          <label className="mt-2 block text-[11px] text-[var(--color-ink-subtle)]">
            Starts
            <input
              type="datetime-local"
              defaultValue={toDateTimeInput(startAt)}
              onChange={(event) =>
                onChange({ startAt: event.target.value || null, endAt: toDateTimeInput(endAt) })
              }
              className="mt-0.5 w-full rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-1.5 py-1 text-[12px] text-[var(--color-ink)]"
            />
          </label>

          <label className="mt-1.5 block text-[11px] text-[var(--color-ink-subtle)]">
            Ends
            <input
              type="datetime-local"
              defaultValue={toDateTimeInput(endAt)}
              onChange={(event) =>
                onChange({ startAt: toDateTimeInput(startAt), endAt: event.target.value || null })
              }
              className="mt-0.5 w-full rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-1.5 py-1 text-[12px] text-[var(--color-ink)]"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              close();
              onChange({ startAt: null, endAt: null });
            }}
            className="mt-2 w-full rounded-[var(--radius-control)] px-2 py-1 text-[12px] text-[var(--color-ink-subtle)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
          >
            Clear both
          </button>
        </div>
      )}
    </Popover>
  );
}

export function AssigneePicker({
  users,
  selectedIds,
  onChange,
  disabled,
}: {
  users: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const selected = users.filter((user) => selectedIds.includes(user.id));

  const trigger = selected.length ? (
    <span className="flex -space-x-1.5">
      {selected.map((user) => (
        <Avatar key={user.id} name={user.name} size="small" />
      ))}
    </span>
  ) : (
    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-[var(--color-line-strong)] text-[var(--color-ink-subtle)]">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <circle cx="6" cy="4.2" r="2.2" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M2.2 10c.6-1.8 2-2.6 3.8-2.6S9.2 8.2 9.8 10"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );

  return (
    <Popover label="Assign people" disabled={disabled} trigger={trigger}>
      {() => (
        <div className="max-h-64 overflow-y-auto">
          {users.map((user) => {
            const isOn = selectedIds.includes(user.id);

            return (
              <MenuItem
                key={user.id}
                selected={isOn}
                onClick={() =>
                  onChange(
                    isOn ? selectedIds.filter((id) => id !== user.id) : [...selectedIds, user.id],
                  )
                }
              >
                <Avatar name={user.name} size="small" />
                <span className="flex-1 truncate">{user.name}</span>
                {isOn ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path
                      d="m2.5 6.2 2.3 2.3 4.7-5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </MenuItem>
            );
          })}

          {selectedIds.length > 0 ? (
            <MenuItem onClick={() => onChange([])}>Clear everyone</MenuItem>
          ) : null}
        </div>
      )}
    </Popover>
  );
}

/** Moving a task without dragging it: the same menu shape, so it reads as one family. */
export function StatusPicker({
  status,
  columns,
  onChange,
  disabled,
  trigger,
}: {
  status: string;
  columns: { name: string; isClosed: boolean }[];
  onChange: (status: string) => void;
  disabled?: boolean;
  trigger: React.ReactNode;
}) {
  return (
    <Popover label="Move to another column" align="right" disabled={disabled} trigger={trigger}>
      {(close) => (
        <>
          {columns.map((column) => (
            <MenuItem
              key={column.name}
              selected={column.name === status}
              onClick={() => {
                close();
                if (column.name !== status) onChange(column.name);
              }}
            >
              {column.name}
            </MenuItem>
          ))}
        </>
      )}
    </Popover>
  );
}

/** The calendar glyph used wherever a date can be set. */
export function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="1.5" y="2.5" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M1.5 5h9M4 1.5v2M8 1.5v2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
