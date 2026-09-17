'use client';

import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { Input, Select } from '@/components/ui';
import { STATUS_LABELS } from '@/modules/tickets/labels';

/**
 * Filters, in the address bar.
 *
 * The scopes on the left are the four questions an agent actually asks on arriving: what is mine,
 * what has nobody picked up, what have we already missed, and what is everything. A filtered list
 * stays bookmarkable, which is how people build their own morning routine out of a URL.
 */

const SCOPES = [
  { id: 'mine', label: 'Mine' },
  { id: 'open', label: 'All open' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'breached', label: 'Missed' },
  { id: 'all', label: 'Everything' },
];

export function TicketFilters({
  scope,
  queue,
  status,
  priority,
  search,
  queues,
  canSeeEveryone,
}: {
  scope: string;
  queue: string;
  status: string;
  priority: string;
  search: string;
  queues: { id: string; name: string; openTicketCount: number }[];
  canSeeEveryone: boolean;
}) {
  const router = useRouter();

  function apply(next: Record<string, string>) {
    const value = { scope, queue, status, priority, search, ...next };
    const params = new URLSearchParams();

    for (const [key, entry] of Object.entries(value)) {
      if (entry) params.set(key, entry);
    }

    router.push(`/support/tickets?${params.toString()}`);
  }

  return (
    <div className="space-y-2">
      {canSeeEveryone ? (
        <div className="flex flex-wrap items-center gap-1">
          {SCOPES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => apply({ scope: option.id })}
              className={clsx(
                'rounded-[var(--radius-control)] px-2.5 py-1 text-[12px] transition-colors',
                scope === option.id
                  ? 'bg-[var(--color-surface-muted)] font-medium text-[var(--color-ink)]'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          apply({ search: String(data.get('search') ?? '') });
        }}
      >
        <Input
          name="search"
          defaultValue={search}
          placeholder="Number or subject"
          className="max-w-56"
        />

        <Select
          defaultValue={queue}
          onChange={(event) => apply({ queue: event.currentTarget.value })}
          className="max-w-52"
          aria-label="Queue"
        >
          <option value="">Every queue</option>
          {queues.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name} ({option.openTicketCount})
            </option>
          ))}
        </Select>

        <Select
          defaultValue={status}
          onChange={(event) => apply({ status: event.currentTarget.value })}
          className="max-w-48"
          aria-label="Status"
        >
          <option value="">Any status</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        <Select
          defaultValue={priority}
          onChange={(event) => apply({ priority: event.currentTarget.value })}
          className="max-w-40"
          aria-label="Priority"
        >
          <option value="">Any priority</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </Select>
      </form>
    </div>
  );
}
