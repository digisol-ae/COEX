import Link from 'next/link';
import { clsx } from 'clsx';
import type { ComponentProps, ReactNode } from 'react';

/**
 * Small icon buttons for secondary actions, each with a tooltip saying what it does (John,
 * 26 Sep 2026). Primary actions such as Save keep their words: a label on the one thing a screen
 * is for is clearer than any picture.
 *
 * The tooltip is the label itself, shown on hover and on keyboard focus, and read out by screen
 * readers, so an icon never stands without a name. Icons are drawn here rather than taken from a
 * package, in one stroke style, because the rest of COEX already draws its own.
 */

export type IconName =
  | 'previous'
  | 'next'
  | 'edit'
  | 'remove'
  | 'history'
  | 'download'
  | 'lock'
  | 'key'
  | 'access'
  | 'unlink'
  | 'open'
  | 'add'
  | 'archive'
  | 'restore';

const PATHS: Record<IconName, ReactNode> = {
  previous: <path d="M10 3.5 5.5 8l4.5 4.5" />,
  next: <path d="M6 3.5 10.5 8 6 12.5" />,
  edit: (
    <>
      <path d="M10.5 3 13 5.5 6 12.5l-3 .5.5-3z" />
      <path d="M9.5 4 12 6.5" />
    </>
  ),
  remove: (
    <>
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5" />
      <path d="M4.5 4.5 5 13h6l.5-8.5M7 7v3.5M9 7v3.5" />
    </>
  ),
  history: (
    <>
      <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9" />
      <path d="M2.5 2.5v2.5H5M8 5.5V8l2 1.5" />
    </>
  ),
  download: <path d="M8 2.5v7.5M4.5 6.5 8 10l3.5-3.5M3 13h10" />,
  lock: (
    <>
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </>
  ),
  key: (
    <>
      <circle cx="5.5" cy="10.5" r="2.5" />
      <path d="M7.3 8.7 13 3M11 5l1.5 1.5M9.5 6.5 11 8" />
    </>
  ),
  access: (
    <>
      <path d="M8 2 13 4v3.5c0 3-2.2 5.3-5 6.5-2.8-1.2-5-3.5-5-6.5V4z" />
      <path d="m6 8 1.5 1.5L10.5 6.5" />
    </>
  ),
  unlink: (
    <>
      <path d="M6.5 9.5 9.5 6.5M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 0 1 4.5 9l1-1" />
      <path d="M2.5 2.5l2 2M11.5 11.5l2 2" />
    </>
  ),
  open: <path d="M9 3h4v4M13 3 7.5 8.5M11.5 9.5V13H3V4.5h3.5" />,
  add: <path d="M8 3v10M3 8h10" />,
  archive: (
    <>
      <rect x="2.5" y="3" width="11" height="3" rx="1" />
      <path d="M3.5 6v6.5h9V6M6.5 8.5h3" />
    </>
  ),
  restore: (
    <>
      <path d="M3 8a5 5 0 1 0 1.5-3.5" />
      <path d="M3 2.5V5h2.5" />
    </>
  ),
};

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

type Tone = 'default' | 'danger';

function classesFor(tone: Tone, className?: string) {
  return clsx(
    'has-tooltip inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-transparent transition-colors disabled:pointer-events-none disabled:opacity-30',
    tone === 'danger'
      ? 'text-[var(--color-ink-subtle)] hover:bg-[var(--color-status-alert-soft)] hover:text-[var(--color-status-alert)]'
      : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]',
    className,
  );
}

/** A button showing only an icon. `label` is its tooltip and its accessible name. */
export function IconButton({
  icon,
  label,
  tone = 'default',
  className,
  type = 'button',
  ...props
}: Omit<ComponentProps<'button'>, 'children'> & { icon: IconName; label: string; tone?: Tone }) {
  return (
    <button
      {...props}
      type={type}
      aria-label={label}
      data-tooltip={label}
      className={classesFor(tone, className)}
    >
      <Icon name={icon} />
    </button>
  );
}

/** The same, for an action that is a link: a download, or another page. */
export function IconLink({
  icon,
  label,
  tone = 'default',
  className,
  ...props
}: Omit<ComponentProps<typeof Link>, 'children'> & {
  icon: IconName;
  label: string;
  tone?: Tone;
}) {
  return (
    <Link
      {...props}
      aria-label={label}
      data-tooltip={label}
      className={classesFor(tone, className)}
    >
      <Icon name={icon} />
    </Link>
  );
}
