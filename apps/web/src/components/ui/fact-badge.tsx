import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * A fact about a record as an icon and a few words, the building block of the compact detail
 * screens (John, 18 Oct 2026). Several sit on one line; the full name of the fact is in the tooltip,
 * so the line stays quiet. Server safe: no state, no events.
 */

export type FactIcon =
  | 'mail'
  | 'phone'
  | 'globe'
  | 'pin'
  | 'calendar'
  | 'clock'
  | 'money'
  | 'user'
  | 'building'
  | 'percent'
  | 'step'
  | 'box'
  | 'file'
  | 'receipt'
  | 'note'
  | 'alert'
  | 'repeat';

const PATHS: Record<FactIcon, ReactNode> = {
  mail: <path d="M2.5 4.5h11v7h-11zM2.8 4.8 8 8.8l5.2-4" />,
  phone: (
    <path d="M4 2.5h2l1 3-1.4 1a7 7 0 0 0 3.9 3.9l1-1.4 3 1v2a1.5 1.5 0 0 1-1.6 1.5A10.5 10.5 0 0 1 2.5 4.1 1.5 1.5 0 0 1 4 2.5z" />
  ),
  globe: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M2.5 8h11M8 2.5c2 1.6 2 9.4 0 11M8 2.5c-2 1.6-2 9.4 0 11" />
    </>
  ),
  pin: (
    <>
      <path d="M8 14s4.5-4 4.5-7.5a4.5 4.5 0 0 0-9 0C3.5 10 8 14 8 14z" />
      <circle cx="8" cy="6.5" r="1.5" />
    </>
  ),
  calendar: <path d="M3 4.5h10v8.5H3zM3 7.5h10M5.5 3v3M10.5 3v3" />,
  clock: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M8 5v3.2l2 1.3" />
    </>
  ),
  money: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <path d="M9.8 6.2C9.4 5.6 8.8 5.3 8 5.3c-1 0-1.8.5-1.8 1.3 0 1.9 3.8.8 3.8 2.8 0 .8-.8 1.3-1.9 1.3-.9 0-1.6-.3-2-1M8 4v8" />
    </>
  ),
  user: (
    <>
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M3 13c.7-2.4 2.6-3.5 5-3.5s4.3 1.1 5 3.5" />
    </>
  ),
  building: <path d="M3.5 13.5v-10h6v10M9.5 6.5h3v7M5.5 6h2M5.5 8.5h2M5.5 11h2M2.5 13.5h11" />,
  percent: (
    <>
      <path d="m12.5 3.5-9 9" />
      <circle cx="4.7" cy="4.7" r="1.4" />
      <circle cx="11.3" cy="11.3" r="1.4" />
    </>
  ),
  step: <path d="M3 8h9M9 4.5 12.5 8 9 11.5" />,
  box: <path d="M2.5 5 8 2.5 13.5 5v6L8 13.5 2.5 11zM2.5 5 8 7.5 13.5 5M8 7.5v6" />,
  file: <path d="M4 2.5h5l3 3v8H4zM9 2.5v3h3" />,
  receipt: <path d="M4 2.5h8v11l-1.3-1-1.4 1-1.3-1-1.3 1-1.4-1L4 13.5zM6 6h4M6 8.5h4" />,
  note: <path d="M3 3.5h10v7H8l-3 2.5v-2.5H3z" />,
  alert: <path d="M8 2.5 14 13H2zM8 6.5v3M8 11.2v.1" />,
  repeat: <path d="M3 5.5h8l-2-2m4 7H5l2 2" />,
};

export function FactGlyph({ name }: { name: FactIcon }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-[var(--color-ink-subtle)]"
    >
      {PATHS[name]}
    </svg>
  );
}

const pill =
  'inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-xs text-[var(--color-ink)]';

export function FactBadge({
  icon,
  label,
  href,
  tone,
  children,
}: {
  icon: FactIcon;
  /** The name of the fact, shown as the tooltip. */
  label: string;
  href?: string;
  tone?: 'warn' | 'alert';
  children: ReactNode;
}) {
  const text = <span className="min-w-0 truncate">{children}</span>;
  const colour =
    tone === 'alert'
      ? 'border-[var(--color-status-alert)] text-[var(--color-status-alert)]'
      : tone === 'warn'
        ? 'border-[var(--color-status-warn)] text-[var(--color-status-warn)]'
        : '';

  if (href) {
    const external = /^https?:|^mailto:|^tel:/.test(href);
    const content = (
      <>
        <FactGlyph name={icon} />
        {text}
      </>
    );
    const classes = `${pill} ${colour} hover:border-[var(--color-line-strong)] hover:underline`;

    return external ? (
      <a href={href} title={label} className={classes} target="_blank" rel="noreferrer">
        {content}
      </a>
    ) : (
      <Link href={href} title={label} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <span title={label} className={`${pill} ${colour}`}>
      <FactGlyph name={icon} />
      {text}
    </span>
  );
}

/** Facts on one wrapping line. */
export function FactRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-x-2 gap-y-2">{children}</div>;
}
