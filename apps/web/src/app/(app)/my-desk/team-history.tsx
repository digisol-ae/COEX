import Link from 'next/link';
import { Button, Field, Input, Select, Table, Td, Th } from '@/components/ui';
import type { TeamDeskHistoryItem } from '@/modules/tasks/services/desk.service';
import { DeskHistory } from './my-desk-tabs';
import { formatDeskDate } from './format-desk-date';

/**
 * Everyone's Performance history, for people granted `desk.read.all` (John, 1 Oct 2026). The
 * table gives the overview by day; choosing a person shows their whole history exactly as they
 * see it. Filters live in the address, so a view can be refreshed or shared.
 */
export function TeamHistory({
  rows,
  people,
  personId,
  from,
  to,
}: {
  rows: TeamDeskHistoryItem[];
  people: { id: string; name: string }[];
  personId: string | null;
  from: string;
  to: string;
}) {
  const person = personId ? people.find((candidate) => candidate.id === personId) : null;

  return (
    <div className="space-y-4">
      <form
        action="/my-desk"
        className="flex flex-wrap items-end gap-3 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
      >
        <input type="hidden" name="view" value="team" />
        <Field label="Person">
          <Select name="person" defaultValue={personId ?? ''}>
            <option value="">Everyone</option>
            {people.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </Select>
        </Field>
        {person ? null : (
          <>
            <Field label="From">
              <Input type="date" name="from" defaultValue={from} />
            </Field>
            <Field label="To">
              <Input type="date" name="to" defaultValue={to} />
            </Field>
          </>
        )}
        <Button type="submit">Show</Button>
      </form>

      {person ? (
        <>
          <Link
            href={`/my-desk?view=team&from=${from}&to=${to}`}
            className="text-sm text-[var(--color-ink-muted)] underline-offset-4 hover:underline"
          >
            Back to everyone
          </Link>
          <DeskHistory
            history={rows}
            title={`Performance history: ${person.name}`}
            description={`Every day ${person.name} finished on My Desk, newest first.`}
            emptyMessage={`${person.name} has not saved a day on My Desk yet.`}
          />
        </>
      ) : rows.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-line-strong)] p-6 text-sm text-[var(--color-ink-muted)]">
          Nobody saved a day on My Desk between {formatDeskDate(from)} and {formatDeskDate(to)}.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)]">
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Person</Th>
                <Th>Tasks on desk</Th>
                <Th>On time</Th>
                <Th>Overdue</Th>
                <Th>Tomorrow</Th>
                <Th>Due soon</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  data-sort-values={JSON.stringify([
                    row.workDate,
                    row.userName,
                    row.taskCount,
                    row.completedOnTime,
                    row.overdue,
                    row.dueTomorrowNotStarted,
                    row.dueSoonInProgress,
                  ])}
                >
                  <Td>{formatDeskDate(row.workDate)}</Td>
                  <Td>
                    <Link
                      href={`/my-desk?view=team&person=${row.userId}&from=${from}&to=${to}`}
                      title={`See all of ${row.userName}'s history`}
                      className="font-medium text-[var(--color-ink)] underline-offset-4 hover:underline"
                    >
                      {row.userName}
                    </Link>
                  </Td>
                  <Td>{row.taskCount}</Td>
                  <Td>{row.completedOnTime}</Td>
                  <Td>{row.overdue}</Td>
                  <Td>{row.dueTomorrowNotStarted}</Td>
                  <Td>{row.dueSoonInProgress}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
