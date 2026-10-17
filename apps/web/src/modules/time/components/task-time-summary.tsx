'use client';

import { useState, type ReactNode } from 'react';
import { Badge } from '@/components/ui';

/**
 * Time on a task as a row of badges instead of a card of big numbers (John's team, 18 Oct 2026):
 * what you logged, the estimate, and a warning when the estimate is passed. A button opens each
 * person's entries underneath; the entries themselves are drawn by the caller.
 */
export function TaskTimeSummary({
  yourTime,
  estimate,
  overEstimate,
  allPeople,
  hasEntries,
  children,
}: {
  yourTime: string;
  estimate: string | null;
  overEstimate: boolean;
  /** The total of everyone's time, for those who may see it. */
  allPeople: string | null;
  hasEntries: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const chip =
    'inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-surface-muted)] px-2.5 py-1 text-[13px] text-[var(--color-ink)]';

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={chip} title="Time you logged on this task">
          <span className="text-[var(--color-ink-subtle)]">Your time</span>
          <span className="font-medium tabular-nums">{yourTime}</span>
        </span>

        <span className={chip} title="Hours of effort the task should take">
          <span className="text-[var(--color-ink-subtle)]">Estimate</span>
          <span className="font-medium tabular-nums">{estimate ?? 'none'}</span>
        </span>

        {overEstimate ? <Badge tone="warn">over estimate</Badge> : null}

        {hasEntries ? (
          <button
            type="button"
            aria-pressed={open}
            onClick={() => setOpen((value) => !value)}
            title="Show each person's time entries"
            className={`${chip} ml-auto hover:border-[var(--color-line-strong)]`}
          >
            <span className="text-[var(--color-ink-subtle)]">
              {allPeople ? 'All people' : 'Entries'}
            </span>
            {allPeople ? <span className="font-medium tabular-nums">{allPeople}</span> : null}
            <span aria-hidden="true">{open ? '▴' : '▾'}</span>
          </button>
        ) : (
          <span className="ml-auto text-[12px] text-[var(--color-ink-subtle)]">
            No time logged yet
          </span>
        )}
      </div>

      {open ? (
        <div className="mt-2 border-t border-[var(--color-line)] pt-2">{children}</div>
      ) : null}
    </div>
  );
}
