'use client';

import { useRouter } from 'next/navigation';

/** Filters live in the address bar, so any view can be bookmarked or sent to a colleague. */
export function TaskFilters({
  mine,
  overdue,
  unassigned,
  closed,
  canSeeAll,
}: {
  mine: boolean;
  overdue: boolean;
  unassigned: boolean;
  closed: boolean;
  canSeeAll: boolean;
}) {
  const router = useRouter();
  const current = { mine, overdue, unassigned, closed };

  function toggle(key: keyof typeof current) {
    const next = { ...current, [key]: !current[key] };
    const params = new URLSearchParams();

    for (const [name, value] of Object.entries(next)) {
      if (value) params.set(name, '1');
    }

    router.push(`/tasks?${params.toString()}`);
  }

  const options: { key: keyof typeof current; label: string; visible: boolean }[] = [
    { key: 'mine', label: 'Mine', visible: canSeeAll },
    { key: 'overdue', label: 'Overdue', visible: true },
    { key: 'unassigned', label: 'Unassigned', visible: canSeeAll },
    { key: 'closed', label: 'Include done', visible: true },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {options
        .filter((option) => option.visible)
        .map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => toggle(option.key)}
            className={
              current[option.key]
                ? 'rounded-full bg-[var(--color-action)] px-3 py-1 text-sm text-[var(--color-ink-inverse)]'
                : 'rounded-full border border-[var(--color-line-strong)] px-3 py-1 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]'
            }
          >
            {option.label}
          </button>
        ))}
    </div>
  );
}
