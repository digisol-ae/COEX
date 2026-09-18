'use client';

import { useActionState, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Td,
  Th,
} from '@/components/ui';
import { formatMinutes } from '@/modules/time/week';
import { addTimeAction, lockWeekAction, removeTimeAction, type TimeFormState } from './actions';

const initialState: TimeFormState = {};

interface Entry {
  id: string;
  taskNumber: string;
  taskTitle: string;
  spaceName: string;
  organisationName: string | null;
  workDate: string;
  minutes: number;
  note: string | null;
  billable: boolean;
  running: boolean;
  locked: boolean;
}

export function Timesheet({
  timesheet,
  tasks,
  users,
  canLock,
  canSeeOthers,
  viewingSelf,
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
  users: { id: string; name: string }[];
  canLock: boolean;
  canSeeOthers: boolean;
  viewingSelf: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(addTimeAction, initialState);
  const [adding, setAdding] = useState(false);

  const weekStart = new Date(timesheet.weekStart);

  function goToWeek(offset: number) {
    const target = new Date(weekStart);
    target.setDate(target.getDate() + offset * 7);

    const params = new URLSearchParams({ week: target.toISOString().slice(0, 10) });
    if (!viewingSelf) params.set('user', timesheet.userId);

    router.push(`/time?${params.toString()}`);
  }

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => goToWeek(-1)}>
            Previous
          </Button>

          <span className="text-sm font-medium text-[var(--color-ink)]">
            {weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} to{' '}
            {weekEnd.toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>

          <Button variant="secondary" onClick={() => goToWeek(1)}>
            Next
          </Button>

          {timesheet.locked ? <Badge tone="warn">locked</Badge> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canSeeOthers ? (
            <Select
              value={timesheet.userId}
              onChange={(event) =>
                router.push(
                  `/time?week=${timesheet.weekStart.slice(0, 10)}&user=${event.currentTarget.value}`,
                )
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

          <Link
            href={`/time/export?week=${timesheet.weekStart.slice(0, 10)}&user=${timesheet.userId}`}
            className="rounded-[var(--radius-control)] border border-[var(--color-line-strong)] px-4 py-2 text-sm text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
          >
            Export CSV
          </Link>

          {canLock && !timesheet.locked ? (
            <form action={lockWeekAction}>
              <input type="hidden" name="weekStart" value={timesheet.weekStart} />
              <Button type="submit" variant="secondary">
                Lock week
              </Button>
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
                <Th>Task</Th>
                <Th>Space</Th>
                <Th>Time</Th>
                <Th>Billable</Th>
                <Th>{''}</Th>
              </tr>
            </thead>
            <tbody>
              {timesheet.entries.map((entry) => (
                <tr key={entry.id}>
                  <Td className="whitespace-nowrap text-[var(--color-ink-muted)]">
                    {new Date(entry.workDate).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                    })}
                  </Td>
                  <Td>
                    <span className="font-mono text-xs text-[var(--color-ink-subtle)]">
                      {entry.taskNumber}
                    </span>{' '}
                    <span className="text-[var(--color-ink)]">{entry.taskTitle}</span>
                    {entry.note ? (
                      <div className="text-xs text-[var(--color-ink-subtle)]">{entry.note}</div>
                    ) : null}
                  </Td>
                  <Td className="text-[var(--color-ink-muted)]">
                    {entry.organisationName ?? entry.spaceName}
                  </Td>
                  <Td className="tabular-nums text-[var(--color-ink)]">
                    {entry.running ? 'running' : formatMinutes(entry.minutes)}
                  </Td>
                  <Td>{entry.billable ? <Badge tone="ok">billable</Badge> : null}</Td>
                  <Td>
                    {!entry.locked && !entry.running ? (
                      <form action={removeTimeAction}>
                        <input type="hidden" name="id" value={entry.id} />
                        <button
                          type="submit"
                          className="text-xs text-[var(--color-ink-subtle)] underline-offset-4 hover:underline"
                        >
                          Remove
                        </button>
                      </form>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {!timesheet.locked && viewingSelf ? (
        <Card>
          <CardSection title="Add time">
            {adding ? (
              <form action={formAction} className="grid gap-3 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <Field label="Task">
                    <Select name="taskId" required>
                      {tasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.label}
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
                    defaultValue={new Date().toISOString().slice(0, 10)}
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
                  <input type="checkbox" name="billable" defaultChecked />
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
