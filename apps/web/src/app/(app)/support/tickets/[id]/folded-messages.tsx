'use client';

import { useState, type ReactNode } from 'react';

/**
 * The middle of a long conversation, folded to one line. Opening it shows every message between
 * the first and the latest; closing it folds them again. The messages are drawn on the server and
 * only passed through here, so folding costs nothing.
 */
export function FoldedMessages({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full rounded-[var(--radius-card)] border border-dashed border-[var(--color-line-strong)] px-3 py-2 text-center text-xs font-medium text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
      >
        {open
          ? `Hide the ${count} messages in between`
          : `Show ${count} more message${count === 1 ? '' : 's'} in between`}
      </button>

      {open ? <div className="space-y-3">{children}</div> : null}
    </>
  );
}
