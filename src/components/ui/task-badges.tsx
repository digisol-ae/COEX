'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A paperclip badge, shown on a task wherever it appears, when it carries a linked document.
 *
 * One document opens directly on click; more than one opens a small list to choose from, since a
 * single click can only mean one thing. Either way this used to be a plain icon with no way to
 * reach the document itself, which is the point of showing it in the first place.
 */
export function DocumentBadge({
  links,
}: {
  links: { id: string; title: string; url: string }[];
}) {
  const [open, setOpen] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (holder.current && !holder.current.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  if (links.length === 0) return null;

  if (links.length === 1) {
    return (
      <a
        href={links[0].url}
        target="_blank"
        rel="noreferrer"
        onClick={(event) => event.stopPropagation()}
        title={links[0].title}
        className="inline-flex items-center gap-0.5 rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] px-1.5 py-0.5 text-[11px] text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
      >
        <ClipIcon />
      </a>
    );
  }

  return (
    <div ref={holder} className="relative inline-flex">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        title={`${links.length} documents linked`}
        aria-expanded={open}
        className="inline-flex items-center gap-0.5 rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] px-1.5 py-0.5 text-[11px] text-[var(--color-ink-muted)] transition-colors hover:text-[var(--color-ink)]"
      >
        <ClipIcon />
        {links.length}
      </button>

      {open ? (
        <div
          onClick={(event) => event.stopPropagation()}
          className="absolute top-full left-0 z-40 mt-1 w-56 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-pop)]"
        >
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="block truncate rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]"
            >
              {link.title}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ClipIcon() {
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
