import Link from 'next/link';
import { clsx } from 'clsx';
import type { ComponentProps, ReactNode } from 'react';

export type FilterToggleTone = 'default' | 'danger';

export function filterToggleClasses(active: boolean, tone: FilterToggleTone = 'default') {
  return clsx(
    'has-tooltip inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-control)] border px-2 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-action)] disabled:pointer-events-none disabled:opacity-40',
    tone === 'danger'
      ? active
        ? 'border-[var(--color-status-alert-soft)] bg-[var(--color-status-alert-soft)] text-[var(--color-status-alert)]'
        : 'border-[var(--color-status-alert-soft)] text-[var(--color-status-alert)] hover:bg-[var(--color-status-alert-soft)]'
      : active
        ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-surface)]'
        : 'border-[var(--color-line)] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]',
  );
}

/** A compact, accessible filter toggle shared by list screens. */
export function FilterToggleButton({
  label,
  icon,
  active,
  tone = 'default',
  className,
  children,
  dataTooltip,
  ...props
}: Omit<ComponentProps<'button'>, 'children'> & {
  label: string;
  icon?: ReactNode;
  active: boolean;
  tone?: FilterToggleTone;
  children?: ReactNode;
  dataTooltip?: string;
}) {
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      aria-label={label}
      aria-pressed={active}
      title={props.title ?? label}
      data-tooltip={dataTooltip ?? label}
      className={clsx(filterToggleClasses(active, tone), className)}
    >
      {icon}
      {children}
    </button>
  );
}

/** The link counterpart, for URL-backed filters that should remain shareable. */
export function FilterToggleLink({
  label,
  icon,
  active,
  tone = 'default',
  className,
  children,
  dataTooltip,
  ...props
}: Omit<ComponentProps<typeof Link>, 'children'> & {
  label: string;
  icon?: ReactNode;
  active: boolean;
  tone?: FilterToggleTone;
  children?: ReactNode;
  dataTooltip?: string;
}) {
  return (
    <Link
      {...props}
      prefetch={false}
      aria-label={label}
      aria-current={active ? 'true' : undefined}
      title={props.title ?? label}
      data-tooltip={dataTooltip ?? label}
      className={clsx(filterToggleClasses(active, tone), className)}
    >
      {icon}
      {children}
    </Link>
  );
}
