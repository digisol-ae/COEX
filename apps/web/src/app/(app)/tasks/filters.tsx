'use client';

import { clsx } from 'clsx';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui/avatar';
import { Monogram } from '@/components/ui/monogram';
import { FilterToggleButton } from '@/components/ui/filter-toggle';
import { OptionMultiPicker } from '@/components/tasks/option-picker';

type FilterIconName =
  | 'mine'
  | 'overdue'
  | 'unassigned'
  | 'assignedByMe'
  | 'createdByMe'
  | 'closed'
  | 'people'
  | 'spaces';
type TaskFilterKey = 'mine' | 'overdue' | 'unassigned' | 'assignedByMe' | 'createdByMe' | 'closed';
function FilterIcon({ name }: { name: FilterIconName }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === 'closed' ? (
        <>
          <circle cx="8" cy="8" r="5.5" />
          <path d="m5.5 8 1.7 1.7 3.3-3.4" />
        </>
      ) : name === 'overdue' ? (
        <>
          <circle cx="7" cy="7" r="5" />
          <path d="M7 4v3l2 1m3 2v2m0 2h.01" />
        </>
      ) : name === 'spaces' ? (
        <>
          <rect x="2" y="2" width="5" height="5" rx="1" />
          <rect x="9" y="2" width="5" height="5" rx="1" />
          <rect x="2" y="9" width="5" height="5" rx="1" />
          <rect x="9" y="9" width="5" height="5" rx="1" />
        </>
      ) : name === 'createdByMe' ? (
        <>
          <circle cx="6" cy="5" r="2.5" />
          <path d="M1.5 14v-1a4.5 4.5 0 0 1 9 0v1" />
          <path d="m10 8 3-3 2 2-3 3-2 .5z" />
        </>
      ) : (
        <>
          <circle cx="6" cy="5" r="2.5" />
          <path d="M1.5 14v-1a4.5 4.5 0 0 1 9 0v1" />
          {name === 'assignedByMe' ? (
            <path d="M10 7h5m-2-2 2 2-2 2" />
          ) : name === 'unassigned' ? (
            <path d="m11 3 4 4m0-4-4 4" />
          ) : name === 'mine' ? (
            <path d="m10 9 2 2 3-3" />
          ) : (
            <path d="M11 3a2.5 2.5 0 0 1 0 5m1 3a3.5 3.5 0 0 1 2.5 3" />
          )}
        </>
      )}
    </svg>
  );
}
const filterButton =
  'has-tooltip inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-[var(--radius-control)] border px-2 text-xs transition-colors';
/** Filters live in the address bar, so any view can be bookmarked or sent to a colleague. */
export function TaskFilters({
  personalWork,
  mine,
  overdue,
  unassigned,
  assignedByMe,
  createdByMe,
  closed,
  canSeeAll,
  spaces,
  users,
  selectedSpaceIds,
  selectedAssigneeIds,
}: {
  personalWork: 'active' | 'done' | 'all';
  mine: boolean;
  overdue: boolean;
  unassigned: boolean;
  assignedByMe: boolean;
  createdByMe: boolean;
  closed: boolean;
  canSeeAll: boolean;
  spaces: { id: string; name: string }[];
  users: { id: string; name: string }[];
  selectedSpaceIds: string[];
  selectedAssigneeIds: string[];
}) {
  const router = useRouter();
  const current = { mine, overdue, unassigned, assignedByMe, createdByMe, closed };

  function go(next: { flags?: typeof current; spaceIds?: string[]; assigneeIds?: string[] }) {
    const flags = next.flags ?? current;
    const params = new URLSearchParams();
    params.set('personalWork', personalWork);

    for (const [name, value] of Object.entries(flags)) {
      if (value) params.set(name, '1');
    }
    for (const id of next.spaceIds ?? selectedSpaceIds) params.append('space', id);
    for (const id of next.assigneeIds ?? selectedAssigneeIds) params.append('assignee', id);

    router.push(`/tasks?${params.toString()}`);
  }

  function toggle(key: keyof typeof current) {
    const flags = { ...current, [key]: !current[key] };
    // "Mine" and "Assigned by me" are alternatives, like "Mine" and a chosen set of people.
    if (flags[key] && key === 'mine') {
      flags.assignedByMe = false;
      flags.createdByMe = false;
    }
    if (flags[key] && (key === 'assignedByMe' || key === 'createdByMe')) flags.mine = false;
    if (flags[key] && key === 'assignedByMe') flags.createdByMe = false;
    if (flags[key] && key === 'createdByMe') flags.assignedByMe = false;
    go({ flags });
  }

  const options: { key: TaskFilterKey; label: string; visible: boolean }[] = [
    // Picking people replaces "Mine": the two would otherwise contradict each other.
    { key: 'closed', label: 'Done', visible: true },
    { key: 'unassigned', label: 'Unassigned', visible: canSeeAll },
    { key: 'assignedByMe', label: 'Assigned by me', visible: true },
    { key: 'mine', label: 'Mine', visible: canSeeAll && selectedAssigneeIds.length === 0 },
    { key: 'createdByMe', label: 'Created by me', visible: true },
    { key: 'overdue', label: 'Overdue', visible: true },
  ];

  const chosenUsers = users.filter((user) => selectedAssigneeIds.includes(user.id));

  return (
    <div className="coex-filters flex flex-wrap items-center gap-1.5" aria-label="Task filters">
      {mine ? (
        <select
          aria-label="My subtask visibility"
          title="Choose active work, completed subtasks or all your work"
          value={personalWork}
          className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-transparent px-2 py-1 text-xs"
          onChange={(event) => {
            const params = new URLSearchParams(window.location.search);
            params.set('personalWork', event.target.value);
            router.push(`/tasks?${params}`);
          }}
        >
          <option value="active">Active</option>
          <option value="done">My subtask done</option>
          <option value="all">All my work</option>
        </select>
      ) : null}
      {options
        .filter((option) => option.key === 'closed' && option.visible)
        .map((option) => (
          <TaskFilterButton
            key={option.key}
            option={option}
            current={current}
            closed={closed}
            toggle={toggle}
          />
        ))}
      <OptionMultiPicker
        trigger={
          <span
            className={clsx(
              filterButton,
              'border-[var(--color-line)] text-[var(--color-ink-muted)]',
            )}
          >
            <FilterIcon name="spaces" />
            <span>Spaces</span>
            {selectedSpaceIds.length ? (
              <span className="font-semibold">{selectedSpaceIds.length}</span>
            ) : null}
          </span>
        }
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
          trigger={
            <span
              className={clsx(
                filterButton,
                'border-[var(--color-line)]',
                chosenUsers.length
                  ? 'bg-[var(--color-surface-muted)] text-[var(--color-ink)]'
                  : 'text-[var(--color-ink-muted)]',
              )}
            >
              {chosenUsers.length ? (
                <>
                  <span className="flex -space-x-1">
                    {chosenUsers.slice(0, 2).map((user) => (
                      <Avatar key={user.id} name={user.name} size="small" />
                    ))}
                  </span>
                  {chosenUsers.length > 1 ? (
                    <span className="font-semibold">{chosenUsers.length}</span>
                  ) : null}
                </>
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface-muted)]">
                  <FilterIcon name="people" />
                </span>
              )}
            </span>
          }
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

      <span className="flex flex-wrap items-center gap-1.5">
        {options
          .filter((option) => option.visible && option.key !== 'closed' && option.key !== 'overdue')
          .map((option) => (
            <TaskFilterButton
              key={option.key}
              option={option}
              current={current}
              closed={closed}
              toggle={toggle}
            />
          ))}
      </span>
      <span className="ml-auto flex items-center border-l border-[var(--color-line)] pl-2">
        {options
          .filter((option) => option.key === 'overdue' && option.visible)
          .map((option) => (
            <TaskFilterButton
              key={option.key}
              option={option}
              current={current}
              closed={closed}
              toggle={toggle}
            />
          ))}
      </span>
    </div>
  );
}

function TaskFilterButton({
  option,
  current,
  closed,
  toggle,
}: {
  option: { key: TaskFilterKey; label: string; visible: boolean };
  current: Record<TaskFilterKey, boolean>;
  closed: boolean;
  toggle: (key: TaskFilterKey) => void;
}) {
  return (
    <FilterToggleButton
      onClick={() => toggle(option.key)}
      label={option.label}
      active={current[option.key]}
      tone={option.key === 'overdue' ? 'danger' : 'default'}
      title={
        option.key === 'closed'
          ? closed
            ? 'Hide completed tasks'
            : 'Show completed tasks'
          : option.key === 'mine'
            ? 'Tasks assigned to me'
            : option.key === 'overdue'
              ? 'Tasks past their due date'
              : option.key === 'unassigned'
                ? 'Tasks with no assignee'
                : option.key === 'assignedByMe'
                  ? 'Tasks I assigned to other people'
                  : 'Tasks I created'
      }
      dataTooltip={
        option.key === 'closed'
          ? closed
            ? 'Hide completed tasks'
            : 'Show completed tasks'
          : option.label
      }
      icon={<FilterIcon name={option.key} />}
    >
      {option.key === 'closed' ? 'Done' : null}
    </FilterToggleButton>
  );
}
