'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui';

/**
 * Choosing another ticket by searching for it.
 *
 * The chosen ticket's id goes into a hidden field, so the form still posts an id while the person
 * only ever sees a number and a subject. Merging into the wrong ticket is not recoverable in any
 * pleasant way, so the choice is shown back in full before the form can be submitted.
 */

interface Found {
  id: string;
  number: string;
  subject: string;
  status: string;
  customer: string | null;
}

export function TicketPicker({
  name,
  excludeId,
  label,
}: {
  name: string;
  excludeId: string;
  label: string;
}) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Found[]>([]);
  const [chosen, setChosen] = useState<Found | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function search(value: string) {
    setTerm(value);

    if (timer.current) clearTimeout(timer.current);

    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    timer.current = setTimeout(async () => {
      const response = await fetch(
        `/api/tickets/search?q=${encodeURIComponent(value)}&exclude=${excludeId}`,
      );

      if (!response.ok) return;

      const payload: { results: Found[] } = await response.json();
      setResults(payload.results);
    }, 250);
  }

  if (chosen) {
    return (
      <div className="rounded-[var(--radius-control)] border border-[var(--color-line)] px-2.5 py-2">
        <input type="hidden" name={name} value={chosen.id} />

        <p className="text-sm text-[var(--color-ink)]">
          <span className="font-mono text-[11px] text-[var(--color-ink-subtle)]">
            {chosen.number}
          </span>{' '}
          {chosen.subject}
        </p>

        <button
          type="button"
          onClick={() => {
            setChosen(null);
            setResults([]);
            setTerm('');
          }}
          className="mt-1 text-[11px] text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
        >
          Choose a different ticket
        </button>
      </div>
    );
  }

  return (
    <div>
      <Input
        value={term}
        onChange={(event) => search(event.target.value)}
        placeholder={label}
        aria-label={label}
      />

      {results.length > 0 ? (
        <ul className="mt-1 max-h-56 overflow-y-auto rounded-[var(--radius-control)] border border-[var(--color-line)]">
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => setChosen(result)}
                className="flex w-full flex-col items-start gap-0.5 px-2.5 py-1.5 text-left transition-colors hover:bg-[var(--color-surface-muted)]"
              >
                <span className="text-sm text-[var(--color-ink)]">
                  <span className="font-mono text-[11px] text-[var(--color-ink-subtle)]">
                    {result.number}
                  </span>{' '}
                  {result.subject}
                </span>
                <span className="text-[11px] text-[var(--color-ink-subtle)]">
                  {[result.customer, result.status].filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
