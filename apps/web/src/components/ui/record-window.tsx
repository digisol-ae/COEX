'use client';

import { Children, useId, useState, type ReactNode } from 'react';
import { RECORD_PAGE_SIZE } from '@/modules/core/record-page-size';

export { RECORD_PAGE_SIZE } from '@/modules/core/record-page-size';

/** Reset when a filter/sort changes the result set; never slice before filtering or sorting. */
export function useRecordWindow<T>(records: readonly T[], resetKey: string, revealIndex = -1) {
  const [window, setWindow] = useState({ key: resetKey, limit: RECORD_PAGE_SIZE });
  const previousLimit = window.key === resetKey ? window.limit : RECORD_PAGE_SIZE;
  // Creation can finish before refreshed records arrive. Reveal the saved record once present,
  // and keep that expanded budget for subsequent edits and refreshes.
  const limit = Math.max(
    previousLimit,
    Math.ceil((revealIndex + 1) / RECORD_PAGE_SIZE) * RECORD_PAGE_SIZE,
  );
  if (window.key !== resetKey || window.limit !== limit) {
    setWindow({ key: resetKey, limit });
  }
  return {
    items: records.slice(0, limit),
    shown: Math.min(limit, records.length),
    total: records.length,
    showMore: () => setWindow({ key: resetKey, limit: limit + RECORD_PAGE_SIZE }),
  };
}

export function ShowMore({
  shown,
  total,
  showMore,
}: {
  shown: number;
  total: number;
  showMore: () => void;
}) {
  if (total <= RECORD_PAGE_SIZE) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-t border-[var(--color-line)] px-3 py-3 text-xs">
      <span role="status" aria-live="polite" className="text-[var(--color-ink-muted)]">
        Showing {shown} of {total}
      </span>
      {shown < total ? (
        <button
          type="button"
          onClick={showMore}
          title={`Show the next ${Math.min(RECORD_PAGE_SIZE, total - shown)} records`}
          className="rounded-[var(--radius-control)] border border-[var(--color-line)] px-3 py-1.5 font-medium hover:bg-[var(--color-surface-muted)]"
        >
          Show more
        </button>
      ) : null}
    </div>
  );
}

/** For record cards supplied by a server component; form choices and summary tiles are not records. */
export function RecordList({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'ul' | 'ol';
}) {
  const id = useId();
  const records = Children.toArray(children);
  const key = records
    .map((row, index) => (typeof row === 'object' && row && 'key' in row ? row.key : index))
    .join('|');
  const page = useRecordWindow(records, key);
  return (
    <>
      <Tag id={id} className={className}>
        {page.items}
      </Tag>
      <ShowMore {...page} />
    </>
  );
}

/** Give each independently grouped board column its own display window. */
export function RecordWindow<T extends { id: string }>({
  records,
  resetKey,
  revealId,
  children,
}: {
  records: readonly T[];
  resetKey: string;
  revealId?: string;
  children: (items: readonly T[]) => ReactNode;
}) {
  const page = useRecordWindow(
    records,
    resetKey,
    records.findIndex((row) => row.id === revealId),
  );
  return (
    <>
      {children(page.items)}
      <ShowMore {...page} />
    </>
  );
}
