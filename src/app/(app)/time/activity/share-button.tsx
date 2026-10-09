'use client';

import { useActionState, useState } from 'react';
import { Button, Field, Input, Notice } from '@/components/ui';
import { shareActivityAction, type ShareState } from './actions';

/**
 * Shares what is on screen as a PDF: download it, or email it to colleagues or the person whose
 * progress it shows. The filters travel as the address query, so the PDF matches the page.
 */
export function ShareButton({
  query,
  suggestions,
}: {
  query: string;
  suggestions: { name: string; email: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ShareState, FormData>(shareActivityAction, {});

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Share
      </Button>
      {open ? (
        <div
          className="popup-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Share team activity"
        >
          <form action={action} className="w-full max-w-lg popup-glass p-5 text-left">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--color-ink)]">
                Share team activity
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                ✕
              </button>
            </div>
            <p className="mb-3 text-sm text-[var(--color-ink-muted)]">
              Sends the report for the days and filters on screen, as a PDF.
            </p>
            <input type="hidden" name="filters" value={query} />

            <Field label="Email to" hint="One or more addresses, separated by commas.">
              <Input name="to" list="activity-recipients" placeholder="name@example.com" required />
              <datalist id="activity-recipients">
                {suggestions.map((person) => (
                  <option key={person.email} value={person.email}>
                    {person.name}
                  </option>
                ))}
              </datalist>
            </Field>
            <Field label="Message (optional)">
              <Input name="note" />
            </Field>

            {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
            {state.sent ? <Notice tone="ok">{state.sent}</Notice> : null}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <a
                href={`/time/activity/pdf?${query}`}
                className="text-sm text-[var(--color-ink-muted)] underline"
              >
                Download PDF instead
              </a>
              <span className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Close
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? 'Sending' : 'Email PDF'}
                </Button>
              </span>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
