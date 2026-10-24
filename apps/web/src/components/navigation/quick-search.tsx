'use client';
import { DeskTaskButton } from '@/components/tasks/desk-task-button';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelSearch = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    requestRef.current?.abort();
    sequence.current++;
  }, []);

  const openSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setLoading(false);
    setError('');
    setActive(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const visible = [
          ...document.querySelectorAll<HTMLButtonElement>(
            'button[aria-label="Search tasks, spaces, customers"]',
          ),
        ].filter((button) => button.getBoundingClientRect().width > 0);
        if (visible.at(-1) === triggerRef.current) openSearch();
      }

      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openSearch]);

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    function position() {
      if (!trigger || !panelRef.current) return;
      const rect = trigger.getBoundingClientRect();
      const width = Math.min(360, window.innerWidth - 24);
      const top = Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - 160));
      Object.assign(panelRef.current.style, {
        width: `${width}px`,
        left: `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`,
        top: `${top}px`,
        maxHeight: `${Math.max(100, window.innerHeight - top - 12)}px`,
      });
    }
    position();
    inputRef.current?.focus();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      cancelSearch();
      trigger?.focus();
    };
  }, [open, cancelSearch]);

  function search(text: string) {
    setQuery(text);
    setActive(0);
    setResults([]);
    setError('');
    requestRef.current?.abort();
    const current = ++sequence.current;
    setLoading(text.trim().length >= 2);

    if (timerRef.current) clearTimeout(timerRef.current);

    if (text.trim().length < 2) {
      setResults([]);
      return;
    }

    // A short delay so a fast typist sends one request rather than one per keystroke.
    timerRef.current = setTimeout(async () => {
      try {
        const controller = new AbortController();
        requestRef.current = controller;
        const response = await fetch(`/api/search?q=${encodeURIComponent(text.trim())}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Search is unavailable. Please try again.');
        const data = (await response.json()) as { results?: Result[] };
        if (current !== sequence.current) return;
        setResults(data.results ?? []);
        setActive(0);
      } catch {
        if (current === sequence.current) {
          setResults([]);
          setError('Search is unavailable. Please try again.');
        }
      } finally {
        if (current === sequence.current) setLoading(false);
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
        ref={triggerRef}
        type="button"
        aria-label="Search tasks, spaces, customers"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={openSearch}
        className="flex h-8 min-w-0 w-full max-w-md items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface-muted)] px-3 text-[13px] text-[var(--color-ink-subtle)] transition-colors hover:border-[var(--color-line-strong)]"
      >
        <svg
          className="shrink-0"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.5" />
          <path d="m9.5 9.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left">
          Search tasks, spaces, customers
        </span>
        <kbd className="hidden shrink-0 rounded border border-[var(--color-line)] px-1.5 py-0.5 text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      {open
        ? createPortal(
            <div className="fixed inset-0 z-[100]">
              <button
                type="button"
                aria-label="Close search"
                onClick={() => setOpen(false)}
                className="absolute inset-0 bg-transparent"
              />

              <div
                ref={panelRef}
                role="dialog"
                aria-label="Quick search"
                aria-modal="true"
                className="fixed flex flex-col overflow-hidden rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-surface)] shadow-lg"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    setOpen(false);
                    return;
                  }
                  if (event.key !== 'Tab') return;
                  const items = panelRef.current?.querySelectorAll<HTMLElement>(
                    'input, button:not(:disabled)',
                  );
                  if (!items?.length) return;
                  const first = items[0],
                    last = items[items.length - 1];
                  if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                  } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                  }
                }}
              >
                <label className="sr-only" htmlFor="quick-search-query">
                  Search tasks, spaces and customers
                </label>
                <input
                  ref={inputRef}
                  id="quick-search-query"
                  value={query}
                  onChange={(event) => search(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      setActive((current) =>
                        Math.max(0, Math.min(current + 1, results.length - 1)),
                      );
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
                  placeholder="Search tasks, spaces, customers…"
                  className="min-w-0 w-full shrink-0 border-b border-[var(--color-line)] px-4 py-3 text-sm outline-none"
                />

                <div className="min-h-0 max-h-72 overflow-y-auto" aria-live="polite">
                  {query.trim().length < 2 ? (
                    <p className="px-4 py-3 text-center text-sm text-[var(--color-ink-subtle)]">
                      Type at least two letters
                    </p>
                  ) : loading ? (
                    <p className="px-4 py-3 text-sm" role="status">
                      Searching…
                    </p>
                  ) : error ? (
                    <p className="px-4 py-3 text-sm" role="alert">
                      {error}
                    </p>
                  ) : results.length === 0 ? (
                    <p className="px-4 py-3 text-center text-sm text-[var(--color-ink-subtle)]">
                      Nothing found
                    </p>
                  ) : (
                    results.map((result, index) => (
                      <div className="flex items-center" key={`${result.href}-${index}`}>
                        <button
                          type="button"
                          onMouseEnter={() => setActive(index)}
                          onClick={() => choose(result)}
                          className={clsx(
                            'flex min-w-0 flex-1 items-center gap-3 px-4 py-2.5 text-left',
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
                        {result.type === 'Task' ? (
                          <DeskTaskButton taskId={result.href.split('/').pop()!} />
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
