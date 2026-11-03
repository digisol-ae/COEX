'use client';

import { useRouter } from 'next/navigation';
import { Input, Select } from '@/components/ui';
import { Icon, IconButton } from '@/components/ui/icon-button';
import { FilterToggleButton } from '@/components/ui/filter-toggle';
import { STATUS_LABELS } from '@/modules/tickets/labels';

/** Colored workload counts double as list filters; URLs remain bookmarkable. */
const SCOPES = [
  {
    id: 'open',
    key: 'opened',
    label: 'Opened',
    hint: 'All active tickets',
  },
  {
    id: 'delayed',
    key: 'delayed',
    label: 'Delayed',
    hint: 'An SLA deadline is within the next hour',
  },
  {
    id: 'missed',
    key: 'missed',
    label: 'Missed',
    hint: 'A reply or resolution SLA deadline has been missed',
  },
] as const;

export function TicketFilters({
  scope,
  queue,
  status,
  priority,
  search,
  assignee,
  people,
  queues,
  counts,
}: {
  scope: string;
  queue: string;
  status: string;
  priority: string;
  search: string;
  /** The person whose tickets are shown; empty means everyone. */
  assignee: string;
  /** Offered only to those who may see every ticket; an agent only ever sees their own. */
  people: { id: string; name: string }[] | null;
  queues: { id: string; name: string; openTicketCount: number }[];
  counts: { opened: number; delayed: number; missed: number };
}) {
  const router = useRouter();

  function apply(next: Record<string, string>) {
    const value = { scope, queue, status, priority, search, assignee, ...next };
    const params = new URLSearchParams();

    for (const [key, entry] of Object.entries(value)) {
      if (entry) params.set(key, entry);
    }

    router.push(`/support/tickets?${params.toString()}`);
  }

  return (
    <div className="coex-filters space-y-1.5" aria-label="Ticket filters">
      <div className="flex flex-wrap gap-2" aria-label="Ticket analytics">
        <FilterToggleButton
          label="All ticket statuses"
          icon={<Icon name="filter" />}
          active={scope === 'all' && !status}
          onClick={() => apply({ scope: 'all', status: '' })}
        >
          All statuses
        </FilterToggleButton>
        {SCOPES.map((option) => {
          const selected =
            scope === option.id ||
            (option.id === 'open' && scope === 'mine') ||
            (option.id === 'missed' && scope === 'breached');
          return (
            <FilterToggleButton
              key={option.id}
              label={`${option.label}: ${option.hint}`}
              title={option.hint}
              icon={
                <Icon
                  name={
                    option.id === 'open' ? 'inbox' : option.id === 'delayed' ? 'clock' : 'alert'
                  }
                />
              }
              active={selected}
              tone={option.id === 'missed' ? 'danger' : 'default'}
              onClick={() => apply({ scope: option.id, status: '' })}
            >
              {option.label}
              <span className="font-semibold tabular-nums">({counts[option.key]})</span>
            </FilterToggleButton>
          );
        })}
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const term = String(data.get('search') ?? '').trim();
          apply({ search: term, scope: term ? 'all' : 'open' });
        }}
      >
        <Input
          key={search}
          name="search"
          defaultValue={search}
          placeholder="Keyword, customer, contact, email or phone"
          aria-label="Search tickets"
          maxLength={120}
          className="min-w-0 flex-1 basis-72 max-w-xl"
        />

        <IconButton type="submit" icon="search" label="Search tickets" />
        {search ? (
          <IconButton
            type="button"
            icon="close"
            label="Clear ticket search"
            onClick={() => apply({ search: '', scope: 'open' })}
          />
        ) : null}

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

        {people ? (
          <Select
            value={assignee}
            onChange={(event) => apply({ assignee: event.currentTarget.value })}
            className="max-w-52"
            aria-label="Assigned to"
          >
            <option value="">All agents</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </Select>
        ) : null}

        <Select
          defaultValue={status}
          onChange={(event) =>
            apply({
              status: event.currentTarget.value,
              scope: event.currentTarget.value || search ? 'all' : 'open',
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
      <p className="text-xs text-[var(--color-ink-subtle)]">
        Search ticket number, subject, description, replies, notes, customer/contact, email, phone,
        tags or attachment names. All words must match; use &quot;quotes&quot; for a phrase. Search
        includes resolved and closed tickets; selected filters still apply.
      </p>
    </div>
  );
}
