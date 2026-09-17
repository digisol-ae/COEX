import { requireUser } from '@/lib/session';
import { logoutAction } from '../login/actions';
import { Sidebar } from '@/components/navigation/sidebar';
import { visibleGroups } from '@/components/navigation/navigation';

/**
 * Shell for every signed in screen.
 *
 * Permissions are applied on the server, so a link the person may not open is never sent to the
 * browser at all rather than merely hidden with styling.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const groups = visibleGroups(user.permissions);

  return (
    <div className="flex min-h-screen">
      <Sidebar groups={groups} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface)] px-6 py-3">
          <div>
            <p className="text-sm font-medium text-[var(--color-ink)]">{user.tenantName}</p>
            <p className="text-xs text-[var(--color-ink-subtle)]">
              {user.name} · {user.role.replace('_', ' ')}
            </p>
          </div>

          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-[var(--radius-control)] border border-[var(--color-line-strong)] px-3 py-1.5 text-sm text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
            >
              Sign out
            </button>
          </form>
        </header>

        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
