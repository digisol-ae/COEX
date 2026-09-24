'use client';

import { useEffect, useRef, useState } from 'react';

interface AttachmentView {
  id: string;
  fileName: string;
  sizeLabel: string;
  previewable: boolean;
}

/** How long the open/close transition runs, kept as one number so the timeout that unmounts the
 * dialog can never drift out of sync with the CSS duration driving it. */
const TRANSITION_MS = 220;

/**
 * One attachment on a message.
 *
 * A safe, re-encoded photo opens in a popup on click, because that is what "view it" means for a
 * screenshot. `previewable` is decided server-side, in `conversation.tsx`, against the real
 * `PROCESSED_IMAGE_TYPES` list; that module touches sharp and the database, so it cannot be
 * imported here, and this component trusts the boolean it is handed rather than re-deciding. The
 * attachment route itself refuses to serve anything else inline regardless of what this component
 * asks for, so this is a matching affordance, not the actual security boundary.
 *
 * The card scales up from slightly smaller and fades in, and reverses on the way out, rather than
 * a true macOS-style genie warp: that effect needs a mesh or path distortion (Framer Motion, GSAP,
 * or a hand-built canvas warp), none of which is in this stack yet, and reaching for one just for
 * this would be a heavier dependency than the effect is worth. This is the same family of
 * transition macOS Quick Look itself uses for a plain image preview.
 */
export function AttachmentItem({ ticketId, attachment }: { ticketId: string; attachment: AttachmentView }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const downloadHref = `/api/tickets/${ticketId}/attachments/${attachment.id}`;

  function open() {
    window.clearTimeout(closeTimer.current);
    setMounted(true);
    // Mounted with the closed state's classes first, then flipped to visible on the next frame,
    // so the browser has a starting point to transition away from instead of appearing instantly.
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
  }

  function close() {
    setVisible(false);
    closeTimer.current = window.setTimeout(() => setMounted(false), TRANSITION_MS);
  }

  useEffect(() => {
    if (!mounted) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const chip = (
    <span className="flex items-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] px-2 py-1 text-[11px] text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]">
      <Paperclip />
      {attachment.fileName}
      <span className="text-[var(--color-ink-subtle)]">{attachment.sizeLabel}</span>
    </span>
  );

  if (!attachment.previewable) {
    return (
      <a href={downloadHref} className="inline-flex">
        {chip}
      </a>
    );
  }

  return (
    <>
      <button type="button" onClick={open} className="inline-flex">
        {chip}
      </button>

      {mounted ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={attachment.fileName}
          onClick={close}
          style={{ transitionDuration: `${TRANSITION_MS}ms` }}
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-8 backdrop-blur-sm transition-opacity ease-out ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{ transitionDuration: `${TRANSITION_MS}ms` }}
            className={`flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-card)] border border-white/10 bg-[var(--color-surface)] shadow-2xl transition-all ease-out ${
              visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
            }`}
          >
            <div className="flex items-center justify-between gap-4 border-b border-[var(--color-line)] px-4 py-2.5 text-sm">
              <span className="truncate text-[var(--color-ink)]">{attachment.fileName}</span>
              <div className="flex shrink-0 items-center gap-3">
                <a
                  href={downloadHref}
                  className="text-[var(--color-ink-muted)] underline underline-offset-4 hover:text-[var(--color-ink)] hover:no-underline"
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="overflow-auto bg-[var(--color-surface-sunken)] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${downloadHref}?view=1`}
                alt={attachment.fileName}
                className="mx-auto max-h-[68vh] max-w-full rounded-[var(--radius-control)] object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Paperclip() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M8.5 3.5 4.7 7.3a1.6 1.6 0 0 0 2.26 2.26L10.5 6a2.6 2.6 0 1 0-3.68-3.68L3.3 5.86a3.4 3.4 0 0 0 4.81 4.81"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
