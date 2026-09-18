import { clsx } from 'clsx';

/**
 * A status pill.
 *
 * Dense lists are read by scanning, and a scan follows shape and colour before it reads words. A
 * pill gives the status a constant shape and position in every row, which is what lets someone
 * find the blocked work without reading a single line.
 *
 * The colour is chosen from the meaning of the column name rather than from its position, so a
 * space that renames "In progress" to "Working" keeps the same blue.
 */

type PillTone = 'todo' | 'progress' | 'blocked' | 'done' | 'review';

const TONE_CLASSES: Record<PillTone, string> = {
  todo: 'bg-[var(--color-pill-todo)] text-[var(--color-pill-todo-ink)]',
  progress: 'bg-[var(--color-pill-progress)] text-[var(--color-pill-progress-ink)]',
  blocked: 'bg-[var(--color-pill-blocked)] text-[var(--color-pill-blocked-ink)]',
  done: 'bg-[var(--color-pill-done)] text-[var(--color-pill-done-ink)]',
  review: 'bg-[var(--color-pill-review)] text-[var(--color-pill-review-ink)]',
};

export function toneForStatus(status: string, isClosed = false): PillTone {
  const name = status.toLowerCase();

  if (isClosed || /done|complete|closed|resolved|live/.test(name)) return 'done';
  if (/block|hold|waiting|pending/.test(name)) return 'blocked';
  if (/review|test|qa|check/.test(name)) return 'review';
  if (/progress|doing|active|working|open/.test(name)) return 'progress';

  return 'todo';
}

export function StatusPill({
  status,
  isClosed,
  className,
}: {
  status: string;
  isClosed?: boolean;
  className?: string;
}) {
  const tone = toneForStatus(status, isClosed);

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70"
      />
      {status}
    </span>
  );
}

/**
 * The status as a single dot, for the left edge of a card.
 *
 * A card already carries its column by position, so repeating the whole pill on it wastes the
 * widest line. The dot keeps the colour, and clicking it is how the status changes.
 */
export function StatusDot({
  status,
  isClosed,
  className,
}: {
  status: string;
  isClosed?: boolean;
  className?: string;
}) {
  const tone = toneForStatus(status, isClosed);

  return (
    <span
      title={status}
      className={clsx(
        'inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-inset',
        DOT_CLASSES[tone],
        className,
      )}
    />
  );
}

const DOT_CLASSES: Record<PillTone, string> = {
  todo: 'bg-transparent ring-[var(--color-pill-todo-ink)]',
  progress: 'bg-transparent ring-[var(--color-pill-progress-ink)]',
  blocked: 'bg-transparent ring-[var(--color-pill-blocked-ink)]',
  review: 'bg-transparent ring-[var(--color-pill-review-ink)]',
  done: 'bg-[var(--color-pill-done-ink)] ring-[var(--color-pill-done-ink)]',
};

/**
 * Priority as a flag rather than a fill.
 *
 * Filling a row with priority colour competes with status. A small flag sits quietly at normal and
 * low, and is the one red thing in the row when something is genuinely urgent.
 */
export function PriorityFlag({ priority }: { priority: string }) {
  const colour = {
    urgent: 'var(--color-priority-urgent)',
    high: 'var(--color-priority-high)',
    normal: 'var(--color-priority-normal)',
    low: 'var(--color-priority-low)',
  }[priority ?? 'normal'];

  return (
    <span title={`${priority} priority`} className="inline-flex items-center">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path
          d="M3 1.5v9"
          stroke={colour}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity={priority === 'low' ? 0.5 : 1}
        />
        <path
          d="M3 2.2h5.4a.4.4 0 0 1 .32.64L7.5 4.4l1.22 1.56a.4.4 0 0 1-.32.64H3z"
          fill={colour}
          opacity={priority === 'low' || priority === 'normal' ? 0.45 : 1}
        />
      </svg>
      <span className="sr-only">{priority} priority</span>
    </span>
  );
}

/** A small neutral chip for dates, folders and counts, so a row reads as objects not sentences. */
export function Chip({
  children,
  tone = 'neutral',
  title,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'alert';
  title?: string;
}) {
  return (
    <span
      title={title}
      className={clsx(
        'inline-flex items-center gap-1 rounded-[var(--radius-control)] px-1.5 py-0.5 text-[11px] whitespace-nowrap',
        tone === 'alert'
          ? 'bg-[var(--color-status-alert-soft)] text-[var(--color-status-alert)]'
          : 'bg-[var(--color-surface-sunken)] text-[var(--color-ink-muted)]',
      )}
    >
      {children}
    </span>
  );
}
