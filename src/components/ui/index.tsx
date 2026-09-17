import { clsx } from 'clsx';
import type { ComponentProps, ReactNode } from 'react';

/**
 * The shared component library.
 *
 * Small on purpose. Every screen uses these rather than repeating class strings, so a designer can
 * change the look of the whole product here. Components never carry raw hex values, only tokens
 * defined in globals.css.
 */

export function PageHeader({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        {icon ? <span className="mt-1">{icon}</span> : null}
        <div>
          <h1 className="text-xl font-bold text-[var(--color-ink)]">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-[var(--color-ink-muted)]">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className,
  ...props
}: ComponentProps<'div'> & { children: ReactNode }) {
  return (
    <div
      {...props}
      className={clsx(
        'surface-raised rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="border-b border-[var(--color-line)] px-5 py-4 last:border-b-0">
      {title ? (
        <h2 className="mb-3 text-xs font-medium tracking-wide text-[var(--color-ink-subtle)] uppercase">
          {title}
        </h2>
      ) : null}
      {children}
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger';

export function Button({
  variant = 'primary',
  className,
  ...props
}: ComponentProps<'button'> & { variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      className={clsx(
        'rounded-[var(--radius-control)] px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60',
        variant === 'primary' &&
          'bg-[var(--color-action)] text-[var(--color-ink-inverse)] shadow-[0_1px_2px_rgb(20_20_20/12%)] hover:bg-[var(--color-action-hover)]',
        variant === 'secondary' &&
          'border border-[var(--color-line-strong)] text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]',
        // Red is reserved for destruction and alarm. Nothing else in the product uses it.
        variant === 'danger' &&
          'border border-[var(--color-status-alert)] text-[var(--color-status-alert)] hover:bg-[var(--color-status-alert-soft)]',
        className,
      )}
    />
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-sm font-medium text-[var(--color-ink)]">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-[var(--color-ink-subtle)]">{hint}</span> : null}
    </label>
  );
}

const CONTROL_CLASSES =
  'w-full rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input {...props} className={clsx(CONTROL_CLASSES, className)} />;
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select {...props} className={clsx(CONTROL_CLASSES, className)} />;
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return (
    <th className="border-b border-[var(--color-line)] px-4 py-2 text-left text-[11px] font-medium tracking-wide text-[var(--color-ink-subtle)] uppercase">
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={clsx('border-b border-[var(--color-line)] px-4 py-2 align-middle', className)}>
      {children}
    </td>
  );
}

type Tone = 'neutral' | 'ok' | 'warn' | 'alert' | 'info';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
        tone === 'neutral' && 'bg-[var(--color-surface-sunken)] text-[var(--color-ink-muted)]',
        tone === 'ok' && 'bg-[var(--color-status-ok-soft)] text-[var(--color-status-ok)]',
        tone === 'warn' && 'bg-[var(--color-status-warn-soft)] text-[var(--color-status-warn)]',
        tone === 'alert' && 'bg-[var(--color-status-alert-soft)] text-[var(--color-status-alert)]',
        tone === 'info' && 'bg-[var(--color-status-info-soft)] text-[var(--color-status-info)]',
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="px-5 py-8 text-center text-sm text-[var(--color-ink-subtle)]">{message}</p>;
}

export function Notice({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <p
      role="status"
      className={clsx(
        'rounded-[var(--radius-control)] px-3 py-2 text-sm',
        tone === 'ok' && 'bg-[var(--color-status-ok-soft)] text-[var(--color-status-ok)]',
        tone === 'alert' && 'bg-[var(--color-status-alert-soft)] text-[var(--color-status-alert)]',
        tone === 'info' && 'bg-[var(--color-status-info-soft)] text-[var(--color-status-info)]',
      )}
    >
      {children}
    </p>
  );
}
