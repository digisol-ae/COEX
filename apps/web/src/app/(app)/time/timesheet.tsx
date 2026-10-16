'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  CardSection,
  EmptyState,
  Field,
  Input,
  Notice,
  Select,
  Table,
  Th,
} from '@/components/ui';
import { formatMinutes } from '@coex/shared/time/week';
import { IconButton, IconLink } from '@/components/ui/icon-button';
import { EntryRow, type Entry } from './entry-row';
import { addTimeAction, lockWeekAction, type TimeFormState } from './actions';
import { toDateKey } from '@coex/shared/time/week';

const initialState: TimeFormState = {};

export function Timesheet({
  timesheet,
  tasks,
  items,
  assignedKeys,
  users,
  canLock,
  canSeeOthers,
  viewingSelf,
  canEditThisSheet,
}: {
  timesheet: {
    weekStart: string;
    locked: boolean;
    userId: string;
    userName: string;
    entries: Entry[];
    totalMinutes: number;
    billableMinutes: number;
  };
  tasks: { id: string; label: string }[];
  /** Everything time can be added to: tasks and tickets, keyed task:ID or ticket:ID. */
  items: { key: string; label: string }[];
  /** The open work assigned to the signed-in person, whether or not any time is logged on it. */
  assignedKeys: string[];
  users: { id: string; name: string }[];
  canLock: boolean;
  canSeeOthers: boolean;
  viewingSelf: boolean;
  canEditThisSheet: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(addTimeAction, initialState);
  const [adding, setAdding] = useState(false);
  const [chosen, setChosen] = useState('');

  const weekStart = new Date(timesheet.weekStart);

  function goToWeek(offset: number) {
    const target = new Date(weekStart);
    target.setDate(target.getDate() + offset * 7);

    const params = new URLSearchParams({ week: toDateKey(target) });
    if (!viewingSelf) params.set('user', timesheet.userId);

    router.push(`/time?${params.toString()}`);
  }

  // Assigned work that has nothing logged this week still deserves a line to add time to
  // (John's team, 15 Oct 2026: it only appeared once somebody started a timer).
  const loggedKeys = new Set(
    timesheet.entries.map((entry) =>
      entry.kind === 'ticket' ? `ticket:${entry.ticketId}` : `task:${entry.taskId}`,
    ),
  );
  const labelFor = new Map(items.map((item) => [item.key, item.label]));
  const openWork = assignedKeys
    .filter((key) => !loggedKeys.has(key) && labelFor.has(key))
    .map((key) => ({ key, label: labelFor.get(key) ?? key }));

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconButton icon="previous" label="Previous week" onClick={() => goToWeek(-1)} />

          <span className="text-sm font-medium text-[var(--color-ink)]">
            {weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} to{' '}
            {weekEnd.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>

          <IconButton icon="next" label="Next week" onClick={() => goToWeek(1)} />

          {timesheet.locked ? <Badge tone="warn">locked</Badge> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canSeeOthers ? (
            <Select
              value={timesheet.userId}
              onChange={(event) =>
                router.push(`/time?week=${toDateKey(weekStart)}&user=${event.currentTarget.value}`)
              }
              className="max-w-48"
              aria-label="Whose timesheet"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          ) : null}

          <IconLink
            icon="download"
            label="Download this week as CSV"
            prefetch={false}
            href={`/time/export?week=${toDateKey(weekStart)}&user=${timesheet.userId}`}
          />

          {canLock && !timesheet.locked ? (
            <form action={lockWeekAction}>
              <input type="hidden" name="weekStart" value={timesheet.weekStart} />
              <IconButton
                type="submit"
                icon="lock"
                label="Lock this week so its time can no longer change"
              />
            </form>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Total label="This week" value={formatMinutes(timesheet.totalMinutes)} />
        <Total label="Billable" value={formatMinutes(timesheet.billableMinutes)} />
        <Total
          label="Not billable"
          value={formatMinutes(timesheet.totalMinutes - timesheet.billableMinutes)}
        />
        <Total label="Entries" value={String(timesheet.entries.length)} />
      </div>

      <Card>
        {timesheet.entries.length === 0 ? (
          <EmptyState message="No time recorded this week." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Day</Th>
                <Th>Task or ticket</Th>
                <Th>Space</Th>
                <Th>Time</Th>
                <Th>Billable</Th>
                <Th>{''}</Th>
              </tr>
            </thead>
            <tbody>
              {timesheet.entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  sortValues={[
                    new Date(entry.workDate).getTime(),
                    entry.taskTitle,
                    entry.organisationName ?? entry.spaceName,
                    entry.minutes,
                    entry.billable ? 1 : 0,
                  ]}
                  entry={entry}
                  tasks={tasks}
                  canEdit={canEditThisSheet && !timesheet.locked}
                  columns={6}
                />
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {!timesheet.locked && viewingSelf && openWork.length > 0 ? (
        <Card>
          <CardSection title="Your open work with no time this week">
            <ul className="divide-y divide-[var(--color-line)]">
              {openWork.map((item) => (
                <li key={item.key} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-sm text-[var(--color-ink)]">
                    {item.label}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setChosen(item.key);
                      setAdding(true);
                    }}
                  >
                    Add time
                  </Button>
                </li>
              ))}
            </ul>
          </CardSection>
        </Card>
      ) : null}

      {!timesheet.locked && viewingSelf ? (
        <Card>
          <CardSection title="Add time">
            {adding ? (
              <form action={formAction} className="grid gap-3 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <Field label="Task or ticket">
                    <Select
                      name="item"
                      required
                      value={chosen || items[0]?.key || ''}
                      onChange={(event) => setChosen(event.currentTarget.value)}
                    >
                      {items.map((item) => (
                        <option key={item.key} value={item.key}>
                          {item.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <Field label="Day">
                  <Input
                    name="workDate"
                    type="date"
                    required
                    defaultValue={toDateKey(new Date())}
                  />
                </Field>

                <Field label="Time" hint="1.5, 1:30 or 90m">
                  <Input name="duration" required placeholder="1:30" />
                </Field>

                <div className="sm:col-span-3">
                  <Field label="Note" hint="Optional. What the time went on.">
                    <Input name="note" />
                  </Field>
                </div>

                <label className="flex items-end gap-2 pb-2 text-sm text-[var(--color-ink-muted)]">
                  <input type="checkbox" name="billable" />
                  Billable
                </label>

                <div className="sm:col-span-4">
                  {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
                  <div className="mt-2 flex gap-2">
                    <Button type="submit" disabled={pending}>
                      {pending ? 'Adding' : 'Add time'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <Button onClick={() => setAdding(true)}>Add time</Button>
            )}
          </CardSection>
        </Card>
      ) : null}
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-xs font-medium tracking-wide text-[var(--color-ink-subtle)] uppercase">
        {label}
      </p>
      <p className="mt-1 text-lg font-medium text-[var(--color-ink)] tabular-nums">{value}</p>
    </Card>
  );
}
