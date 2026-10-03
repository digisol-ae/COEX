'use client';

import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { Input, Select } from '@/components/ui';
import { STATUS_LABELS } from '@/modules/tickets/labels';

/** Colored workload counts double as list filters; URLs remain bookmarkable. */
const SCOPES = [
  {
    id: 'open',
    key: 'opened',
    label: 'Opened',
    hint: 'All active tickets',
    color: 'text-[var(--color-status-ok)] bg-[var(--color-status-ok-soft)]',
  },
  {
    id: 'delayed',
    key: 'delayed',
    label: 'Delayed',
    hint: 'An SLA deadline is within the next hour',
    color: 'text-[var(--color-status-warn)] bg-[var(--color-status-warn-soft)]',
  },
  {
    id: 'missed',
    key: 'missed',
    label: 'Missed',
    hint: 'A reply or resolution SLA deadline has been missed',
    color: 'text-[var(--color-status-alert)] bg-[var(--color-status-alert-soft)]',
  },
] as const;

export function TicketFilters({
  scope,
  queue,
  status,
  priority,
  search,
  queues,
  counts,
}: {
  scope: string;
  queue: string;
  status: string;
  priority: string;
  search: string;
  queues: { id: string; name: string; openTicketCount: number }[];
  counts: { opened: number; delayed: number; missed: number };
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
      <div className="flex flex-wrap gap-2" aria-label="Ticket analytics">
        {SCOPES.map((option) => {
          const selected =
            scope === option.id ||
            (option.id === 'open' && scope === 'mine') ||
            (option.id === 'missed' && scope === 'breached');
          return (
            <button
              key={option.id}
              type="button"
              title={option.hint}
              aria-pressed={selected}
              onClick={() => apply({ scope: option.id, status: '' })}
              className={clsx(
                'inline-flex items-center gap-2 rounded-[var(--radius-control)] border px-3 py-2 text-sm font-medium transition-colors',
                option.color,
                selected ? 'border-current' : 'border-transparent hover:border-current',
              )}
            >
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
              {option.label}
              <span className="font-semibold tabular-nums">({counts[option.key]})</span>
            </button>
          );
        })}
      </div>

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
          onChange={(event) =>
            apply({
              status: event.currentTarget.value,
              scope: event.currentTarget.value ? 'all' : 'open',
            })
          }
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
