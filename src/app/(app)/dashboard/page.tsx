import Link from 'next/link';
import { asUser, requireUser } from '@/lib/session';
import { loadDashboard } from '@/modules/tasks/services/dashboard.service';
import { Card, CardSection, EmptyState, PageHeader } from '@/components/ui';
import { formatMinutes } from '@/modules/time/week';

export const metadata = { title: 'Dashboard · COEX' };

/**
 * The screen you land on after signing in, not a report buried in a menu.
 *
 * Built in the same milestone as the task record rather than afterwards, because a task system
 * without visibility is just a list nobody reads. An agent sees their own work; a manager and
 * above see the tenant.
 */
export default async function DashboardPage() {
  const user = await requireUser();

  const seesEverything = user.permissions.includes('task.read.all');

  const data = await asUser(user, () =>
    loadDashboard({ onlyAssigneeId: seesEverything ? undefined : user.id }),
  );

  const tiles = [
    { label: 'Open', value: data.tiles.open, href: '/tasks', tone: 'ink' },
    { label: 'Overdue', value: data.tiles.overdue, href: '/tasks?overdue=1', tone: 'alert' },
    { label: 'Due today', value: data.tiles.dueToday, href: '/tasks', tone: 'warn' },
    {
      label: 'Unassigned',
      value: data.tiles.unassigned,
      href: '/tasks?unassigned=1',
      tone: 'ink',
    },
    { label: 'Blocked', value: data.tiles.blocked, href: '/tasks', tone: 'ink' },
  ] as const;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={`Good day, ${user.name.split(' ')[0]}`}
        description={
          seesEverything ? 'Everything open across the tenant, as of now.' : 'Your work, as of now.'
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href}>
            <Card className="h-full px-4 py-4 transition-colors hover:bg-[var(--color-surface-muted)]">
              <p className="text-xs font-medium tracking-wide text-[var(--color-ink-subtle)] uppercase">
                {tile.label}
              </p>
              <p
                className={
                  tile.value === 0
                    ? 'mt-1 text-2xl font-bold text-[var(--color-ink-subtle)]'
                    : tile.tone === 'alert'
                      ? 'mt-1 text-2xl font-bold text-[var(--color-status-alert)]'
                      : tile.tone === 'warn'
                        ? 'mt-1 text-2xl font-bold text-[var(--color-status-warn)]'
                        : 'mt-1 text-2xl font-bold text-[var(--color-ink)]'
                }
              >
                {tile.value}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-4 px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-medium tracking-wide text-[var(--color-ink-subtle)] uppercase">
              Logged this week
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--color-ink)] tabular-nums">
              {formatMinutes(data.week.loggedMinutes)}
            </p>
          </div>

          <p className="text-sm text-[var(--color-ink-muted)]">
            {data.week.estimatedMinutes > 0
              ? `against ${formatMinutes(data.week.estimatedMinutes)} estimated on open work`
              : 'no estimates set on open work yet'}
          </p>

          <Link
            href="/time"
            className="text-sm text-[var(--color-ink-muted)] underline-offset-4 hover:underline"
          >
            Open timesheet
          </Link>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardSection title="Open work by project">
            {data.byProject.length === 0 ? (
              <EmptyState message="Nothing open." />
            ) : (
              <ul className="space-y-2">
                {data.byProject.map((row) => (
                  <li key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-ink)]">{row.label}</span>
                    <span className="text-[var(--color-ink-muted)]">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardSection>
        </Card>

        <Card>
          <CardSection title="Open work by person">
            {data.byAssignee.length === 0 ? (
              <EmptyState message="Nothing assigned." />
            ) : (
              <ul className="space-y-2">
                {data.byAssignee.map((row) => (
                  <li key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-ink)]">{row.label}</span>
                    <span className="text-[var(--color-ink-muted)]">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardSection>
        </Card>
      </div>

      <Card className="mt-6">
        <CardSection title="Untouched for more than seven days">
          {data.ageing.length === 0 ? (
            <EmptyState message="Nothing is going stale. Everything open has been touched this week." />
          ) : (
            <ul className="space-y-2">
              {data.ageing.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="truncate text-[var(--color-ink)] underline-offset-4 hover:underline"
                  >
                    <span className="font-mono text-xs text-[var(--color-ink-subtle)]">
                      {task.number}
                    </span>{' '}
                    {task.title}
                  </Link>
                  <span className="shrink-0 text-xs text-[var(--color-ink-muted)]">
                    {task.days} days
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardSection>
      </Card>
    </div>
  );
}
