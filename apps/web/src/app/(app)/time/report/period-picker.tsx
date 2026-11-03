'use client';

import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui';
import { Icon } from '@/components/ui/icon-button';
import { FilterToggleButton } from '@/components/ui/filter-toggle';

/** The period lives in the address bar, so a report can be bookmarked or sent to someone. */
export function PeriodPicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();

  return (
    <form
      className="coex-filters flex flex-wrap items-end gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        router.push(`/time/report?from=${data.get('from')}&to=${data.get('to')}`);
      }}
    >
      <label className="space-y-1.5">
        <span className="block text-sm font-medium text-[var(--color-ink)]">From</span>
        <Input name="from" type="date" defaultValue={from} />
      </label>

      <label className="space-y-1.5">
        <span className="block text-sm font-medium text-[var(--color-ink)]">To</span>
        <Input name="to" type="date" defaultValue={to} />
      </label>

      <FilterToggleButton
        type="submit"
        label="Show time report"
        active={false}
        icon={<Icon name="filter" />}
      >
        Show
      </FilterToggleButton>
    </form>
  );
}
