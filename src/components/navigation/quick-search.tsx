'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

/**
 * Search from anywhere, opened by clicking or by pressing the command key and K.
 *
 * People who live in a tool stop navigating and start typing what they want. Without this, finding
 * a task means remembering which space it is in, which is exactly the friction that sends
 * someone back to the tool they were using before.
 */

interface Result {
  type: string;
  label: string;
  detail: string;
  href: string;
}

export function QuickSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }

      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  function search(text: string) {
    setQuery(text);

    if (timerRef.current) clearTimeout(timerRef.current);

    if (text.trim().length < 2) {
      setResults([]);
      return;
    }

    // A short delay so a fast typist sends one request rather than one per keystroke.
    timerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(text)}`);
        const data = (await response.json()) as { results?: Result[] };
        setResults(data.results ?? []);
        setActive(0);
      } catch {
        setResults([]);
      }
    }, 180);
  }

  function choose(result: Result | undefined) {
    if (!result) return;

    setOpen(false);
    setQuery('');
    router.push(result.href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full max-w-md items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface-muted)] px-3 text-[13px] text-[var(--color-ink-subtle)] transition-colors hover:border-[var(--color-line-strong)]"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="m9.5 9.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="flex-1 text-left">Search tasks, spaces, customers</span>
        <kbd className="hidden rounded border border-[var(--color-line)] px-1.5 py-0.5 text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24">
          <button
            type="button"
            aria-label="Close search"
            onClick={() => setOpen(false)}
            className="popup-backdrop absolute inset-0"
          />

          <div className="popup-glass relative w-full max-w-lg overflow-hidden">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => search(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActive((current) => Math.min(current + 1, results.length - 1));
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActive((current) => Math.max(current - 1, 0));
                }
                if (event.key === 'Enter') {
                  event.preventDefault();
                  choose(results[active]);
                }
              }}
              placeholder="Search tasks, spaces and customers"
              className="w-full border-b border-[var(--color-line)] px-4 py-3 text-sm outline-none"
            />

            <div className="max-h-80 overflow-y-auto">
              {query.trim().length < 2 ? (
                <p className="px-4 py-6 text-center text-sm text-[var(--color-ink-subtle)]">
                  Type at least two letters
                </p>
              ) : results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[var(--color-ink-subtle)]">
                  Nothing found
                </p>
              ) : (
                results.map((result, index) => (
                  <button
                    key={`${result.href}-${index}`}
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(result)}
                    className={clsx(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left',
                      index === active ? 'bg-[var(--color-surface-muted)]' : 'bg-transparent',
                    )}
                  >
                    <span className="w-16 shrink-0 text-[11px] text-[var(--color-ink-subtle)]">
                      {result.type}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-[var(--color-ink)]">
                        {result.label}
                      </span>
                      <span className="block truncate text-xs text-[var(--color-ink-subtle)]">
                        {result.detail}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
