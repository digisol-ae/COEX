'use client';

import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Monogram } from '@/components/ui/monogram';
import { OptionMultiPicker } from '@/components/tasks/option-picker';

/** Filters live in the address bar, so any view can be bookmarked or sent to a colleague. */
export function TaskFilters({
  mine,
  overdue,
  unassigned,
  closed,
  canSeeAll,
  spaces,
  users,
  selectedSpaceIds,
  selectedAssigneeIds,
}: {
  mine: boolean;
  overdue: boolean;
  unassigned: boolean;
  closed: boolean;
  canSeeAll: boolean;
  spaces: { id: string; name: string }[];
  users: { id: string; name: string }[];
  selectedSpaceIds: string[];
  selectedAssigneeIds: string[];
}) {
  const router = useRouter();
  const current = { mine, overdue, unassigned, closed };

  function go(next: { flags?: typeof current; spaceIds?: string[]; assigneeIds?: string[] }) {
    const flags = next.flags ?? current;
    const params = new URLSearchParams();

    for (const [name, value] of Object.entries(flags)) {
      if (value) params.set(name, '1');
    }
    for (const id of next.spaceIds ?? selectedSpaceIds) params.append('space', id);
    for (const id of next.assigneeIds ?? selectedAssigneeIds) params.append('assignee', id);

    router.push(`/tasks?${params.toString()}`);
  }

  function toggle(key: keyof typeof current) {
    go({ flags: { ...current, [key]: !current[key] } });
  }

  const options: { key: keyof typeof current; label: string; visible: boolean }[] = [
    // Picking people replaces "Mine": the two would otherwise contradict each other.
    { key: 'mine', label: 'Mine', visible: canSeeAll && selectedAssigneeIds.length === 0 },
    { key: 'overdue', label: 'Overdue', visible: true },
    { key: 'unassigned', label: 'Unassigned', visible: canSeeAll },
    { key: 'closed', label: 'Include done', visible: true },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <OptionMultiPicker
        label="Filter by space"
        allLabel="All spaces"
        noun="spaces"
        options={spaces.map((space) => ({
          id: space.id,
          name: space.name,
          icon: <Monogram name={space.name} size="small" />,
        }))}
        selectedIds={selectedSpaceIds}
        onChange={(ids) => go({ spaceIds: ids })}
      />

      {canSeeAll ? (
        <OptionMultiPicker
          label="Filter by assignee"
          allLabel="All assignees"
          noun="people"
          options={users.map((user) => ({
            id: user.id,
            name: user.name,
            icon: <Avatar name={user.name} size="small" />,
          }))}
          selectedIds={selectedAssigneeIds}
          onChange={(ids) =>
            go({
              assigneeIds: ids,
              // "Mine" and a chosen set of people are alternatives.
              flags: ids.length ? { ...current, mine: false } : current,
            })
          }
        />
      ) : null}

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
