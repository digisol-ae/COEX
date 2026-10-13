'use client';

import { clsx } from 'clsx';
import { Avatar } from '@/components/ui/avatar';

/**
 * The toolbar above a view.
 *
 * Filtering lives here rather than in a menu, because a manager opening a space wants their own
 * work, or one person's work, in a single click. Everything filters what is already loaded, so it
 * is instant and the address bar stays clean for the views people bookmark.
 */

export function Toolbar({
  users,
  assigneeId,
  onAssignee,
  showClosed,
  onShowClosed,
  search,
  onSearch,
  action,
}: {
  users: { id: string; name: string }[];
  assigneeId: string | null;
  onAssignee: (id: string | null) => void;
  showClosed: boolean;
  onShowClosed: (value: boolean) => void;
  search: string;
  onSearch: (value: string) => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <button
        type="button"
        onClick={() => onShowClosed(!showClosed)}
        className={clsx(
          'flex items-center gap-1.5 rounded-[var(--radius-control)] border px-2.5 py-1 text-[12px] font-medium transition-colors',
          showClosed
            ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-surface)]'
            : 'border-[var(--color-line)] font-normal text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
        )}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="m4 6 1.4 1.4L8 4.8" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        Closed
      </button>

      <div
        className={clsx(
          'flex items-center gap-1 rounded-[var(--radius-control)] border py-0.5 pr-1 pl-1.5 transition-colors',
          assigneeId
            ? 'border-[var(--color-line-strong)] bg-[var(--color-surface-muted)]'
            : 'border-[var(--color-line)]',
        )}
      >
        <span className="text-[12px] text-[var(--color-ink-subtle)]">Who</span>

        <button
          type="button"
          onClick={() => onAssignee(null)}
          className={clsx(
            'rounded px-1.5 py-0.5 text-[12px] transition-colors',
            assigneeId === null
              ? 'bg-[var(--color-surface-muted)] text-[var(--color-ink)]'
              : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
          )}
        >
          All
        </button>

        <div className="flex -space-x-1.5">
          {users.slice(0, 6).map((user) => (
            <button
              key={user.id}
              type="button"
              title={user.name}
              onClick={() => onAssignee(assigneeId === user.id ? null : user.id)}
              className={clsx(
                'rounded-full transition-all',
                assigneeId === user.id
                  ? 'opacity-100 ring-2 ring-[var(--color-ink)] ring-offset-2 ring-offset-[var(--color-surface)]'
                  : assigneeId
                    ? 'opacity-35 hover:opacity-70'
                    : 'opacity-100',
              )}
            >
              <Avatar name={user.name} size="small" />
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-line)] px-2 py-1">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="m8.2 8.2 2.3 2.3"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Filter tasks"
          className="w-28 bg-transparent text-[12px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-subtle)]"
        />
      </label>

      <div className="ml-auto">{action}</div>
    </div>
  );
}
