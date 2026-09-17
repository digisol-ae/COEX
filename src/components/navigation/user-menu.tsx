import { logoutAction } from '@/app/login/actions';
import { Avatar } from '@/components/ui/avatar';

/**
 * Identity and sign out in the header.
 *
 * Sign out is an icon rather than a button with a word in it: it is used once a day at most, and a
 * full button gives a rare action the same weight as the work on the screen.
 */
export function UserMenu({
  name,
  role,
  tenantName,
}: {
  name: string;
  role: string;
  tenantName: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={name} />

      <div className="hidden min-w-0 sm:block">
        <p className="truncate text-sm font-medium text-[var(--color-ink)]">{name}</p>
        <p className="truncate text-xs text-[var(--color-ink-subtle)]">
          {role.replace('_', ' ')} · {tenantName}
        </p>
      </div>

      <form action={logoutAction}>
        <button
          type="submit"
          title="Sign out"
          aria-label="Sign out"
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-ink-subtle)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M7 15.5H4a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 4 2.5h3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M11.5 12 15 9l-3.5-3M15 9H7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </div>
  );
}
