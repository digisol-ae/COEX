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
      className="flex flex-wrap gap-3"
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
        className="max-w-xs"
      />

      <Select
        defaultValue={kind}
        onChange={(event) => apply({ kind: event.currentTarget.value })}
        className="max-w-40"
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
