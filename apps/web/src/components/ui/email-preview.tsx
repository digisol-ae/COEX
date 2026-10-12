'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * An email as the customer will see it, before anyone sends one (John, 28 Sep 2026). The text comes
 * from the same functions the server sends with (tickets/email-text), filled with sample details,
 * so what is previewed is what goes out.
 */
export function EmailPreview({
  from,
  to,
  subject,
  text,
  note,
  onClose,
}: {
  from: string;
  to: string;
  subject: string;
  text: string;
  /** What was made up for the preview, so nobody mistakes it for a real customer. */
  note?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return createPortal(
    <div
      className="popup-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Email preview"
        className="popup-glass flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-3">
          <h2 className="font-medium text-[var(--color-ink)]">Preview</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-ink-subtle)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
          >
            ✕
          </button>
        </div>

        <dl className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-1 border-b border-[var(--color-line)] px-5 py-3 text-sm">
          <dt className="text-[var(--color-ink-subtle)]">From</dt>
          <dd className="truncate text-[var(--color-ink)]">{from}</dd>
          <dt className="text-[var(--color-ink-subtle)]">To</dt>
          <dd className="truncate text-[var(--color-ink)]">{to}</dd>
          <dt className="text-[var(--color-ink-subtle)]">Subject</dt>
          <dd className="font-medium text-[var(--color-ink)]">{subject}</dd>
        </dl>

        <div className="overflow-y-auto bg-[var(--color-surface)] px-5 py-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--color-ink)]">
            {text}
          </p>
        </div>

        {note ? (
          <p className="border-t border-[var(--color-line)] px-5 py-2 text-xs text-[var(--color-ink-subtle)]">
            {note}
          </p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/** Sample details for previews, obviously invented. */
export const SAMPLE = {
  customer: 'Ayesha Khan',
  company: 'Acme Trading LLC',
  email: 'ayesha.khan@example.com',
  ticket: 'DGS-S-123',
  subject: 'Printer not printing',
  agent: 'Sara Ahmed',
  agentTitle: 'Support Engineer',
  note: 'Sample details: the customer, ticket and agent are made up for this preview.',
} as const;
