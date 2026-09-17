import { clsx } from 'clsx';
import type { SlaState } from '@/modules/tickets/services/ticket.service';
import { SLA_LABELS, untilDue } from '@/modules/tickets/labels';

/**
 * The state of a promise.
 *
 * A support desk is judged on two clocks, so both are shown as one small object with a fixed
 * position in the row. Colour appears only when something is wrong or about to be: a clock that is
 * simply running is quiet, because a wall of amber teaches people to ignore amber.
 */

const TONES: Record<SlaState, string> = {
  none: 'text-[var(--color-ink-subtle)]',
  met: 'text-[var(--color-ink-subtle)]',
  due: 'text-[var(--color-ink-muted)]',
  due_soon: 'bg-[var(--color-status-warn-soft)] text-[var(--color-status-warn)]',
  breached: 'bg-[var(--color-status-alert-soft)] text-[var(--color-status-alert)]',
};

export function SlaChip({
  label,
  state,
  dueAt,
}: {
  label: string;
  state: SlaState;
  dueAt: Date | string | null;
}) {
  if (state === 'none') return <span className="text-[var(--color-ink-subtle)]">No target</span>;

  const detail =
    state === 'met'
      ? 'met'
      : state === 'breached'
        ? SLA_LABELS.breached.toLowerCase()
        : untilDue(dueAt);

  return (
    <span
      title={`${label}: ${SLA_LABELS[state]}`}
      className={clsx(
        'inline-flex items-center gap-1 rounded-[var(--radius-control)] px-1.5 py-0.5 text-[11px] whitespace-nowrap',
        TONES[state],
      )}
    >
      <span className="font-medium">{label}</span>
      {detail}
    </span>
  );
}
