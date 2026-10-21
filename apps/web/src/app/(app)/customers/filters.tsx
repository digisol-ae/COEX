'use client';

import { useRouter } from 'next/navigation';
import { Input, Select } from '@/components/ui';

/** Filters live in the address bar, so a filtered list can be bookmarked or shared. */
export function CustomerFilters({ search, kind }: { search: string; kind: string }) {
  const router = useRouter();

  function apply(next: { search?: string; kind?: string }) {
    const params = new URLSearchParams();
    const value = { search, kind, ...next };

    if (value.search) params.set('search', value.search);
    if (value.kind) params.set('kind', value.kind);

    router.push(`/customers?${params.toString()}`);
  }

  return (
    <form
      className="coex-filters grid w-fit max-w-full grid-cols-[minmax(0,11rem)_7rem] gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        apply({ search: String(data.get('search') ?? '') });
      }}
    >
      <Input
        name="search"
        defaultValue={search}
        placeholder="Search by name"
        aria-label="Search customers by name"
        className="!w-full min-w-0"
      />

      <Select
        defaultValue={kind}
        onChange={(event) => apply({ kind: event.currentTarget.value })}
        aria-label="Customer type"
        className="!w-full min-w-0"
      >
        <option value="">All types</option>
        <option value="client">Clients</option>
        <option value="prospect">Prospects</option>
        <option value="supplier">Suppliers</option>
        <option value="partner">Partners</option>
      </Select>
    </form>
  );
}
