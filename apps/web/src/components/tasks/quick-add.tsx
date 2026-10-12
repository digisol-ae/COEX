'use client';

import { useState, useTransition } from 'react';
import { clsx } from 'clsx';

/**
 * Adding a task where you are looking.
 *
 * Capture and detail are different moments. A form with eight fields is right when you are
 * planning and wrong when someone says one more thing in a meeting, and the second case is what
 * decides whether the board still describes the work next week. This takes a title, puts the task
 * in the column it was typed under, and stays open for the next one.
 */
export function QuickAdd({
  status,
  onAdd,
  variant = 'column',
}: {
  status: string;
  onAdd: (title: string) => Promise<string | null>;
  variant?: 'column' | 'row';
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const [, startTransition] = useTransition();

  function submit() {
    const value = title.trim();
    if (!value) return;

    setTitle('');
    setError(null);

    startTransition(async () => {
      const failure = await onAdd(value);

      if (failure) {
        setError(failure);
        return;
      }

      // A field that just clears with no signal reads as "did that work?", which is exactly what
      // led to duplicate test tasks earlier. A beat of confirmation, then closing, answers that
      // without needing a whole dialog for one line of text.
      setJustAdded(true);
      window.setTimeout(() => {
        setJustAdded(false);
        setOpen(false);
      }, 900);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          'flex w-full items-center gap-1.5 px-2 py-1.5 text-[12px] text-[var(--color-ink-subtle)] transition-colors hover:text-[var(--color-ink)]',
          variant === 'column' &&
            'rounded-[var(--radius-control)] hover:bg-[var(--color-surface-muted)]',
        )}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M6 2.5v7M2.5 6h7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        Add task
      </button>
    );
  }

  return (
    <div className={variant === 'column' ? 'px-1 py-1' : 'px-2 py-1.5'}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <input
          autoFocus
          value={title}
          disabled={justAdded}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => {
            if (!title.trim() && !justAdded) setOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setTitle('');
              setOpen(false);
            }
          }}
          placeholder={`New task in ${status}`}
          aria-label={`New task in ${status}`}
          className="w-full rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[13px] text-[var(--color-ink)] focus:outline-none disabled:opacity-70"
        />
      </form>

      {justAdded ? (
        <p className="mt-1 text-[11px] text-[var(--color-status-ok)]">✓ Task created</p>
      ) : error ? (
        <p className="mt-1 text-[11px] text-[var(--color-status-alert)]">{error}</p>
      ) : (
        <p className="mt-1 text-[11px] text-[var(--color-ink-subtle)]">
          Enter to add, Escape to close
        </p>
      )}
    </div>
  );
}
