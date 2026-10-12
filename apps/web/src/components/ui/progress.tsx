import { clsx } from 'clsx';

/**
 * A single ratio against a limit, which is a meter rather than a chart.
 *
 * The number is always present beside the bar: a bar alone asks the reader to estimate, and a
 * length is not readable to someone using a screen reader. One hue on a track of the same hue,
 * because there is one quantity here and nothing to tell apart.
 */
export function Progress({
  percent,
  label,
  className,
}: {
  percent: number;
  label?: string;
  className?: string;
}) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-sunken)]"
      >
        <div
          className={clsx(
            'h-full rounded-full transition-[width]',
            value === 100 ? 'bg-[var(--color-status-ok)]' : 'bg-[var(--color-person-1)]',
          )}
          style={{ width: `${value}%` }}
        />
      </div>

      <span className="w-9 shrink-0 text-right text-xs text-[var(--color-ink-muted)] tabular-nums">
        {value}%
      </span>
    </div>
  );
}
