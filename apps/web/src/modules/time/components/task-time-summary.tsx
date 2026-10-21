'use client';
import { UI_LABELS } from '@/components/ui/labels';

import { type ReactNode } from 'react';
import { DetailPopup } from '@/components/ui/detail-popup';
import { Badge } from '@/components/ui';

/**
 * Time on a task as a row of badges instead of a card of big numbers (John's team, 18 Oct 2026):
 * what you logged, the estimate, and a warning when the estimate is passed. A button opens each
 * person's entries underneath; the entries themselves are drawn by the caller.
 */
export function TaskTimeSummary({
  yourTime,
  agents,
  estimate,
  overEstimate,
  allPeople,
  hasEntries,
  children,
}: {
  yourTime: string;
  agents: { id: string; name: string; time: string }[];
  estimate: string | null;
  overEstimate: boolean;
  /** The total of everyone's time, for those who may see it. */
  allPeople: string | null;
  hasEntries: boolean;
  children: ReactNode;
}) {
  const chip =
    'inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs text-[var(--color-ink)]';

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-transparent px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={chip} title="Time you logged on this task">
          <span className="text-[var(--color-ink-subtle)]">Your time</span>
          <span className="font-medium tabular-nums">{yourTime}</span>
        </span>

        {agents.map((agent) => (
          <span key={agent.id} className={chip} title={`Time logged by ${agent.name}`}>
            <span className="text-[var(--color-ink-subtle)]">{agent.name}</span>
            <span className="font-medium tabular-nums">{agent.time}</span>
          </span>
        ))}

        <span className={chip} title="Hours of effort the task should take">
          <span className="text-[var(--color-ink-subtle)]">Estimate</span>
          <span className="font-medium tabular-nums">{estimate ?? 'none'}</span>
        </span>

        {overEstimate ? <Badge tone="warn">over estimate</Badge> : null}

        {hasEntries ? (
          <span className={chip}>
            {UI_LABELS.timeHistory}
            <DetailPopup title={UI_LABELS.timeHistory}>{children}</DetailPopup>
          </span>
        ) : (
          <span className="text-[12px] text-[var(--color-ink-subtle)]">No time logged yet</span>
        )}
        {allPeople !== null ? (
          <span
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-[var(--color-status-info)] bg-[var(--color-status-info-soft)] px-3 py-1 text-sm font-semibold text-[var(--color-status-info)]"
            title="Total time logged by all agents on this task"
          >
            <span>Total time</span>
            <span className="font-bold tabular-nums">{allPeople}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
