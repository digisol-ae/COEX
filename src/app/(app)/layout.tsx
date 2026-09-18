import { asUser, requireUser } from '@/lib/session';
import { getRunningTimer } from '@/modules/time/services/time.service';
import { countMyOpenTasks } from '@/modules/tasks/services/task.service';
import { countMyOpenTickets } from '@/modules/tickets/services/metrics.service';
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
  /**
   * The badges on the rail: how much open work is mine, in each place I might have some.
   *
   * Only my own work is counted, whatever the person can see. A manager who can read the whole
   * tenant does not want a badge showing two hundred; a badge is a prompt to act, and a number
   * nobody can act on is decoration that teaches people to ignore the rail.
   */
  const { timer, counts } = await asUser(user, async () => ({
    timer: await getRunningTimer(),
    counts: {
      '/tasks': user.permissions.includes('task.read.own')
        ? await countMyOpenTasks(user.id)
        : undefined,
      '/support/tickets': user.permissions.includes('ticket.read.own')
        ? await countMyOpenTickets(user.id)
        : undefined,
    },
  }));

  return (
    <div className="flex min-h-screen">
      <IconRail permissions={user.permissions} counts={counts} />
      <Sidebar
        groups={groups}
        tenantName={user.tenantName}
        canManageTasks={user.permissions.includes('task.manage')}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)]/95 px-4 py-2 backdrop-blur sm:px-6">
          <MobileNavigation
            groups={groups}
            canManageTasks={user.permissions.includes('task.manage')}
          />

          <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-ink)] sm:hidden">
            {user.tenantName}
          </p>

          <div className="hidden flex-1 justify-center sm:flex">
            <QuickSearch />
          </div>

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

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
