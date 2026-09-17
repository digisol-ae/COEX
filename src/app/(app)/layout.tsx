import { requireUser } from '@/lib/session';
import { Sidebar } from '@/components/navigation/sidebar';
import { MobileNavigation } from '@/components/navigation/mobile-navigation';
import { UserMenu } from '@/components/navigation/user-menu';
import { visibleGroups } from '@/components/navigation/navigation';

/**
 * Shell for every signed in screen.
 *
 * Permissions are applied on the server, so a link the person may not open is never sent to the
 * browser at all rather than merely hidden with styling. The same filtered list feeds the sidebar
 * and the phone drawer.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const groups = visibleGroups(user.permissions);

  return (
    <div className="flex min-h-screen">
      <Sidebar groups={groups} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)]/95 px-4 py-2.5 backdrop-blur sm:px-6">
          <MobileNavigation groups={groups} />

          <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-ink)] sm:hidden">
            {user.tenantName}
          </p>

          <div className="hidden flex-1 sm:block" />

          <UserMenu name={user.name} role={user.role} tenantName={user.tenantName} />
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
