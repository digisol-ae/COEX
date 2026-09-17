'use client';

import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';

/** The period lives in the address bar, so a report can be bookmarked or sent to someone. */
export function PeriodPicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();

  return (
    <form
      className="flex flex-wrap items-end gap-3"
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

      <Button type="submit" variant="secondary">
        Show
      </Button>
    </form>
  );
}
