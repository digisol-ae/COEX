'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { AssigneePicker } from '@/components/tasks/inline-edit';

/**
 * The Team activity filters. People are picked the way assignees are on Tasks and Spaces, and the
 * form is a plain GET, so every view is in the address and can be shared or bookmarked.
 */
export function ActivityFilters({
  from,
  to,
  todayHref,
  status,
  kinds,
  selectedPeople,
  users,
  taskStages,
  ticketStatuses,
}: {
  from: string;
  to: string;
  todayHref: string;
  status: string;
  kinds: ('task' | 'ticket')[];
  selectedPeople: string[];
  users: { id: string; name: string }[];
  taskStages: string[];
  ticketStatuses: { value: string; label: string }[];
}) {
  const [people, setPeople] = useState(selectedPeople);

  return (
    <form method="get" className="mb-4 flex flex-wrap items-end gap-3 text-sm">
      <input type="hidden" name="shown" value="1" />
      {people.map((id) => (
        <input key={id} type="hidden" name="person" value={id} />
      ))}

      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--color-ink-subtle)]">From</span>
        <Input type="date" name="from" defaultValue={from} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--color-ink-subtle)]">To</span>
        <Input type="date" name="to" defaultValue={to} />
      </label>
      <Link
        href={todayHref}
        className="rounded-[var(--radius-control)] border border-[var(--color-line-strong)] px-3 py-2 text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]"
      >
        Today
      </Link>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-[var(--color-ink-subtle)]">People</span>
        <span className="flex h-9 items-center">
          <AssigneePicker users={users} selectedIds={people} onChange={setPeople} />
          {people.length === 0 ? (
            <span className="ml-2 text-xs text-[var(--color-ink-subtle)]">Everyone</span>
          ) : null}
        </span>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-xs text-[var(--color-ink-subtle)]">Show</legend>
        <span className="flex h-9 items-center gap-4">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              name="kind"
              value="task"
              defaultChecked={kinds.includes('task')}
            />
            Tasks
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              name="kind"
              value="ticket"
              defaultChecked={kinds.includes('ticket')}
            />
            Tickets
          </label>
        </span>
      </fieldset>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--color-ink-subtle)]">Stage or status</span>
        <Select name="status" defaultValue={status}>
          <option value="">Any</option>
          <optgroup label="Task stages">
            {taskStages.map((stage) => (
              <option key={stage} value={stage}>
                {stage}
              </option>
            ))}
          </optgroup>
          <optgroup label="Ticket statuses">
            {ticketStatuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </optgroup>
        </Select>
      </label>

      <Button type="submit">Apply</Button>
    </form>
  );
}
