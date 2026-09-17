'use client';

import { useRouter } from 'next/navigation';
import { Input, Select } from '@/components/ui';

/** The window and the queue, in the address bar, so a report can be sent as a link. */
export function MetricsFilters({
  from,
  to,
  queue,
  queues,
}: {
  from: string;
  to: string;
  queue: string;
  queues: { id: string; name: string }[];
}) {
  const router = useRouter();

  function apply(next: Record<string, string>) {
    const value = { from, to, queue, ...next };
    const params = new URLSearchParams();

    for (const [key, entry] of Object.entries(value)) {
      if (entry) params.set(key, entry);
    }

    router.push(`/support/metrics?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="text-[11px] text-[var(--color-ink-subtle)]">
        From
        <Input
          type="date"
          defaultValue={from}
          onChange={(event) => apply({ from: event.target.value })}
          className="mt-0.5 max-w-40"
        />
      </label>

      <label className="text-[11px] text-[var(--color-ink-subtle)]">
        To
        <Input
          type="date"
          defaultValue={to}
          onChange={(event) => apply({ to: event.target.value })}
          className="mt-0.5 max-w-40"
        />
      </label>

      <Select
        defaultValue={queue}
        onChange={(event) => apply({ queue: event.currentTarget.value })}
        className="max-w-52"
        aria-label="Queue"
      >
        <option value="">Every queue</option>
        {queues.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
