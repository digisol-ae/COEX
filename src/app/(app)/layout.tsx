import { asUser, requireUser } from '@/lib/session';
import { getRunningTimer } from '@/modules/time/services/time.service';
import { RunningTimer } from '@/modules/time/components/running-timer';
import { IconRail } from '@/components/navigation/icon-rail';
import { Sidebar } from '@/components/navigation/sidebar';
import { MobileNavigation } from '@/components/navigation/mobile-navigation';
import { QuickSearch } from '@/components/navigation/quick-search';
import { UserMenu } from '@/components/navigation/user-menu';
import { visibleGroups } from '@/components/navigation/navigation';

/**
 * Shell for every signed in screen.
 *
 * Three parts: a rail of destinations that never moves, a panel that lists what is inside the
 * current area, and a bar carrying search, the running timer and identity. Permissions are applied
 * on the server, so a link the person may not open is never sent to the browser at all.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const groups = visibleGroups(user.permissions);
  const timer = await asUser(user, () => getRunningTimer());

  return (
    <div className="flex min-h-screen">
      <IconRail permissions={user.permissions} />
      <Sidebar groups={groups} tenantName={user.tenantName} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)]/95 px-4 py-2.5 backdrop-blur sm:px-6">
          <MobileNavigation groups={groups} />

          <div className="hidden flex-1 sm:flex">
            <QuickSearch />
          </div>

          <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-ink)] sm:hidden">
            {user.tenantName}
          </p>

          {timer ? (
            <RunningTimer
              taskId={timer.taskId}
              taskNumber={timer.taskNumber}
              taskTitle={timer.taskTitle}
              startedAt={timer.startedAt.toISOString()}
            />
          ) : null}

          <UserMenu name={user.name} role={user.role} tenantName={user.tenantName} />
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
