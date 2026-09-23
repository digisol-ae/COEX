import Link from 'next/link';
import { asUser, requirePermission } from '@/lib/session';
import { listUsers } from '@/modules/core/services/user.service';
import { loadTimesheet } from '@/modules/time/services/timesheet.service';
import { formatMinutes, startOfWeek, toDateKey } from '@/modules/time/week';
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';

export const metadata = { title: 'All timesheets · COEX' };

/**
 * Every active person's week, side by side.
 *
 * The per-person timesheet already lets a manager switch to one person at a time; this is the
 * page for the other question, who has and has not logged their week yet, answered in one glance
 * rather than by opening each person in turn. Correcting an entry still happens on that person's
 * own timesheet, reached from here with the week already carried across.
 */
export default async function AllTimesheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const actor = await requirePermission('task.read.all');
  const params = await searchParams;

  const week = params.week ? new Date(params.week) : new Date();
  const weekStart = startOfWeek(week);

  const previousWeek = new Date(weekStart);
  previousWeek.setDate(previousWeek.getDate() - 7);
  const nextWeek = new Date(weekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const { people, sheets } = await asUser(actor, async () => {
    const users = (await listUsers()).filter((user) => user.status === 'active');
    const sheets = await Promise.all(users.map((user) => loadTimesheet(weekStart, user.id)));
    return { people: users, sheets };
  });

  const rows = people
    .map((person, index) => ({ person, sheet: sheets[index] }))
    .sort((a, b) => b.sheet.totalMinutes - a.sheet.totalMinutes);

  const weekKey = toDateKey(weekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="All timesheets"
        description="Every active person's hours for the week, logged or not."
        action={
          <div className="flex items-center gap-2 text-sm">
            <Link
              href={`/time/all?week=${toDateKey(previousWeek)}`}
              className="rounded-[var(--radius-control)] border border-[var(--color-line)] px-3 py-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              Previous week
            </Link>
            <span className="text-[var(--color-ink-muted)]">
              {weekStart.toLocaleDateString('en-GB')} to {weekEnd.toLocaleDateString('en-GB')}
            </span>
            <Link
              href={`/time/all?week=${toDateKey(nextWeek)}`}
              className="rounded-[var(--radius-control)] border border-[var(--color-line)] px-3 py-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            >
              Next week
            </Link>
          </div>
        }
      />

      <Card>
        {rows.length === 0 ? (
          <EmptyState message="No active people to show." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Person</Th>
                <Th>Total</Th>
                <Th>Billable</Th>
                <Th>Status</Th>
                <Th>{''}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ person, sheet }) => (
                <tr key={person.id}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar name={person.name} size="small" />
                      <div>
                        <div className="font-medium text-[var(--color-ink)]">{person.name}</div>
                        <div className="text-xs text-[var(--color-ink-subtle)]">
                          {person.role.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-[var(--color-ink-muted)] tabular-nums">
                    {formatMinutes(sheet.totalMinutes)}
                  </Td>
                  <Td className="text-[var(--color-ink-muted)] tabular-nums">
                    {formatMinutes(sheet.billableMinutes)}
                  </Td>
                  <Td>
                    {sheet.totalMinutes === 0 ? (
                      <Badge tone="warn">Nothing logged</Badge>
                    ) : sheet.locked ? (
                      <Badge tone="ok">Locked</Badge>
                    ) : (
                      <Badge tone="info">Open</Badge>
                    )}
                  </Td>
                  <Td>
                    <Link
                      href={`/time?user=${person.id}&week=${weekKey}`}
                      className="text-[var(--color-ink-muted)] underline-offset-4 hover:text-[var(--color-ink)] hover:underline"
                    >
                      Open
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
