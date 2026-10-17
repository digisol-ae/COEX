'use client';

import { useState } from 'react';

const LIMIT = 700;

/**
 * The words of a message. A long email is cut after a few hundred characters with a "Read more",
 * so one pasted thread does not push the rest of the conversation off the screen; the whole text
 * is one click away, and short messages show in full with no button.
 */
export function BubbleText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > LIMIT;
  const shown = long && !open ? `${text.slice(0, LIMIT).trimEnd()}…` : text;

  return (
    <>
      <p className="text-sm whitespace-pre-wrap text-[var(--color-ink)] [overflow-wrap:anywhere]">
        {shown}
      </p>
      {long ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="mt-1 text-xs font-medium text-[var(--color-ink-muted)] underline underline-offset-4 hover:text-[var(--color-ink)]"
        >
          {open ? 'Show less' : 'Read more'}
        </button>
      ) : null}
    </>
  );
}
