import Link from 'next/link';
import { clsx } from 'clsx';
import { Card, CardSection, EmptyState } from '@/components/ui';
import { untilDue } from '@/modules/tickets/labels';
import type { WorkFilter, WorkItem } from '@/modules/tasks/services/my-work.service';

const FILTERS: { value: WorkFilter; label: string }[] = [
  { value: 'all', label: 'Both' },
  { value: 'tickets', label: 'Tickets only' },
  { value: 'tasks', label: 'Tasks only' },
];

/** The filter lives in the address, so a person's choice survives a refresh and can be bookmarked. */
export function MyWork({
  items,
  filter,
  showFilter,
}: {
  items: WorkItem[];
  filter: WorkFilter;
  /** Only someone with both modules has anything to filter between. */
  showFilter: boolean;
}) {
  return (
    <Card className="mt-4">
      <CardSection title="My work">
        {showFilter ? (
          <nav aria-label="Show" className="mb-3 flex flex-wrap gap-1">
            {FILTERS.map((option) => (
              <Link
                key={option.value}
                href={option.value === 'all' ? '/dashboard' : `/dashboard?work=${option.value}`}
                aria-current={filter === option.value ? 'page' : undefined}
                scroll={false}
                className={clsx(
                  'rounded-[var(--radius-control)] px-3 py-1.5 text-[13px] transition-colors',
                  filter === option.value
                    ? 'bg-[var(--color-surface-muted)] font-medium text-[var(--color-ink)]'
                    : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
                )}
              >
                {option.label}
              </Link>
            ))}
          </nav>
        ) : null}

        {items.length === 0 ? (
          <EmptyState message="Nothing open is assigned to you." />
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {items.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="flex items-center gap-3 py-2 text-sm">
                <span
                  className={clsx(
                    'w-12 shrink-0 rounded px-1.5 py-0.5 text-center text-[10px] font-semibold tracking-wide uppercase',
                    item.kind === 'ticket'
                      ? 'bg-[var(--color-status-info-soft)] text-[var(--color-status-info)]'
                      : 'bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]',
                  )}
                >
                  {item.kind === 'ticket' ? 'Ticket' : 'Task'}
                </span>

                <Link
                  href={item.href}
                  className="min-w-0 flex-1 truncate text-[var(--color-ink)] underline-offset-4 hover:underline"
                >
                  {item.unread ? (
                    <span
                      className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[var(--color-brand-red)] align-middle"
                      aria-label="New from the customer"
                    />
                  ) : null}
                  <span className="font-mono text-xs text-[var(--color-ink-subtle)]">
                    {item.number}
                  </span>{' '}
                  {item.title}
                </Link>

                <span className="hidden shrink-0 text-xs text-[var(--color-ink-muted)] sm:inline">
                  {item.status}
                </span>

                <span
                  className={clsx(
                    'w-24 shrink-0 text-right text-xs',
                    item.overdue
                      ? 'text-[var(--color-status-alert)]'
                      : 'text-[var(--color-ink-muted)]',
                  )}
                >
                  {item.dueAt ? `${item.dueLabel} ${untilDue(item.dueAt)}` : 'no due date'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardSection>
    </Card>
  );
}
