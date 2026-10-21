'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export function MessageOrder({ order }: { order: 'asc' | 'desc' }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
      Message order
      <select
        aria-label="Message order"
        value={order}
        disabled={pending}
        className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-transparent px-2 py-1 text-xs text-[var(--color-ink)]"
        onChange={(event) => {
          const query = new URLSearchParams(searchParams.toString());
          query.set('messageOrder', event.target.value);
          startTransition(() => router.replace(`${pathname}?${query}`, { scroll: false }));
        }}
      >
        <option value="asc">Ascending · Oldest first</option>
        <option value="desc">Descending · Newest first</option>
      </select>
    </label>
  );
}
