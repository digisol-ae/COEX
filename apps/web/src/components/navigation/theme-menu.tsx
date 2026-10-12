'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { clsx } from 'clsx';
import { saveThemeAction } from '@/app/(app)/preferences/actions';

type Theme = 'sunset' | 'light' | 'dark';

const THEMES: { id: Theme; label: string; hint: string; swatch: string }[] = [
  { id: 'sunset', label: 'Sunset', hint: 'Warm sand, the original', swatch: '#f5f8ed' },
  { id: 'light', label: 'Light', hint: 'Neutral white and grey', swatch: '#ffffff' },
  { id: 'dark', label: 'Dark', hint: 'For evenings and dim rooms', swatch: '#1c1c1e' },
];

/**
 * The theme switch in the header (John, 27 Sep 2026). The page changes at once; saving to the
 * account afterwards is what makes the choice follow the person to their other devices.
 */
export function ThemeMenu({ current }: { current: Theme }) {
  const [theme, setTheme] = useState<Theme>(current);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === 'Escape'
          : !box.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  function choose(next: Theme) {
    setTheme(next);
    setOpen(false);
    document.documentElement.setAttribute('data-theme', next);
    startTransition(async () => {
      await saveThemeAction(next);
    });
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Theme"
        data-tooltip="Theme"
        className="has-tooltip flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-ink-subtle)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
      >
        <ThemeIcon theme={theme} />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Theme"
          className="popup-glass fixed inset-x-4 top-16 z-50 p-1.5 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-1 sm:w-60"
        >
          {THEMES.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitemradio"
              aria-checked={theme === option.id}
              onClick={() => choose(option.id)}
              className={clsx(
                'flex w-full items-center gap-3 rounded-[var(--radius-control)] px-2.5 py-2 text-left transition-colors',
                theme === option.id
                  ? 'bg-[var(--color-surface-muted)]'
                  : 'hover:bg-[var(--color-surface-muted)]',
              )}
            >
              <span
                className="h-6 w-6 shrink-0 rounded-full border border-[var(--color-line-strong)]"
                style={{ background: option.swatch }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[var(--color-ink)]">
                  {option.label}
                </span>
                <span className="block text-xs text-[var(--color-ink-subtle)]">{option.hint}</span>
              </span>
              {theme === option.id ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="m3.5 8.5 3 3 6-7"
                    stroke="var(--color-brand-red)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ThemeIcon({ theme }: { theme: Theme }) {
  const common = {
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      {theme === 'dark' ? (
        <path d="M14.5 11A6 6 0 0 1 7 3.5a6 6 0 1 0 7.5 7.5Z" {...common} />
      ) : theme === 'light' ? (
        <>
          <circle cx="9" cy="9" r="3.2" {...common} />
          <path
            d="M9 1.8v1.6M9 14.6v1.6M1.8 9h1.6M14.6 9h1.6M3.9 3.9 5 5M13 13l1.1 1.1M3.9 14.1 5 13M13 5l1.1-1.1"
            {...common}
          />
        </>
      ) : (
        <>
          <path d="M4.5 12.5a4.5 4.5 0 0 1 9 0" {...common} />
          <path d="M1.8 12.5h14.4M4 15h10M9 3.5V6M3.6 6.6l1.3 1.2M14.4 6.6l-1.3 1.2" {...common} />
        </>
      )}
    </svg>
  );
}
