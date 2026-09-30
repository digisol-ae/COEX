import { DeskProvider } from '@/components/tasks/desk-task-button';
import { listDeskTaskIds } from '@/modules/tasks/services/desk.service';
import { asUser, requireUser } from '@/lib/session';
import { getRunningTimer } from '@/modules/time/services/time.service';
import { countMyOpenTasks, listTasks } from '@/modules/tasks/services/task.service';
import { countUnreadTickets } from '@/modules/tickets/services/unread.service';
import { FloatingTimer } from '@/modules/time/components/floating-timer';
import { TimerTray } from '@/modules/time/components/timer-tray';
import { IconRail } from '@/components/navigation/icon-rail';
import { Sidebar } from '@/components/navigation/sidebar';
import { MobileNavigation } from '@/components/navigation/mobile-navigation';
import { QuickSearch } from '@/components/navigation/quick-search';
import { UserMenu } from '@/components/navigation/user-menu';
import { ThemeMenu } from '@/components/navigation/theme-menu';
import { WhatsNew } from '@/components/navigation/whats-new';
import { LATEST_RELEASE_ID } from '@/modules/core/release-notes';
import { orderGroups, visibleGroups } from '@/components/navigation/navigation';
import { getNavigationOrder } from '@/modules/core/services/user.service';
import { ToastProvider } from '@/components/ui/toast';

/**
 * Shell for every signed in screen.
 *
 * Three parts: a rail of destinations that never moves, a panel that lists what is inside the
 * current area, and a bar carrying search, the running timer and identity. Permissions are applied
 * on the server, so a link the person may not open is never sent to the browser at all.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  /**
   * The badges on the rail: a prompt to act, never a total.
   *
   * Tasks counts my open tasks. Support counts tickets where the customer has written since I last
   * looked, because an open ticket I have already read is not news, and a badge that is always
   * lit teaches people to ignore the rail. Unassigned tickets count for whoever sees the whole desk.
   */
  const { timer, counts, order, deskIds, assignedIds } = await asUser(user, async () => ({
    assignedIds: user.permissions.includes('task.read.own')
      ? (await listTasks({ assigneeId: user.id, includeClosed: true })).map((task) => task.id)
      : [],
    deskIds: user.permissions.includes('task.read.own') ? await listDeskTaskIds() : [],
    timer: await getRunningTimer(),
    order: await getNavigationOrder(),
    counts: {
      '/tasks': user.permissions.includes('task.read.own')
        ? await countMyOpenTasks(user.id)
        : undefined,
      '/support/tickets': user.permissions.includes('ticket.read.own')
        ? await countUnreadTickets({
            includeUnassigned: user.permissions.includes('ticket.read.all'),
          })
        : undefined,
    },
  }));

  const groups = orderGroups(visibleGroups(user.permissions), order);

  return (
    <ToastProvider>
      <DeskProvider
        userId={user.permissions.includes('task.read.own') ? user.id : ''}
        initialIds={deskIds}
        assignedIds={assignedIds}
      >
        <div className="flex min-h-screen">
          <IconRail
            permissions={user.permissions}
            counts={counts}
            groupOrder={groups.map((group) => group.id)}
          />
          <Sidebar
            groups={groups}
            tenantName={user.tenantName}
            canManageTasks={user.permissions.includes('task.manage')}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-40 flex touch-manipulation items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)]/95 px-4 py-2 pointer-events-auto backdrop-blur sm:px-6">
              <MobileNavigation
                groups={groups}
                canManageTasks={user.permissions.includes('task.manage')}
                unreadTickets={counts['/support/tickets']}
              />

              <p className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-ink)] sm:hidden">
                {user.tenantName}
              </p>

              <div className="hidden flex-1 justify-center sm:flex">
                <QuickSearch />
              </div>

              {user.permissions.includes('task.read.own') ? (
                <TimerTray running={Boolean(timer)} />
              ) : null}

              <ThemeMenu current={user.theme} />

              <UserMenu
                name={user.name}
                email={user.email}
                tenantName={user.tenantName}
                newsUnseen={user.releaseNotesSeen !== LATEST_RELEASE_ID}
              />
            </header>

            <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>

            <WhatsNew seen={user.releaseNotesSeen} />

            {user.permissions.includes('task.read.own') ? (
              <FloatingTimer
                running={
                  timer
                    ? {
                        kind: timer.kind,
                        itemId: timer.itemId,
                        itemNumber: timer.itemNumber,
                        itemTitle: timer.itemTitle,
                        startedAt: timer.startedAt.toISOString(),
                      }
                    : null
                }
              />
            ) : null}
          </div>
        </div>
      </DeskProvider>
    </ToastProvider>
  );
}
