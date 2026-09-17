'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
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
import type { TaskSummary } from '@/modules/tasks/services/task.service';
import { createTaskAction, moveTaskAction, type TaskFormState } from '../../tasks/actions';

const initialState: TaskFormState = {};

/**
 * Board and list in one component, because they show the same data and the toggle should not
 * reload the page. Moving a card uses a column dropdown rather than drag and drop: it works on a
 * phone, it works with a keyboard, and it never loses a card behind a scroll edge.
 */

const PRIORITY_TONE = {
  urgent: 'alert',
  high: 'warn',
  normal: 'neutral',
  low: 'neutral',
} as const;

export function Board({
  projectId,
  columns,
  tasks,
  users,
  canManage,
  initialView,
}: {
  projectId: string;
  columns: { name: string; isClosed: boolean }[];
  tasks: TaskSummary[];
  users: { id: string; name: string }[];
  canManage: boolean;
  initialView: 'board' | 'list';
}) {
  const [view, setView] = useState<'board' | 'list'>(initialView);
  const [adding, setAdding] = useState(false);
  const [state, formAction, pending] = useActionState(createTaskAction, initialState);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] p-1">
          {(['board', 'list'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={
                view === option
                  ? 'rounded-[var(--radius-control)] bg-[var(--color-surface)] px-3 py-1 text-sm font-medium text-[var(--color-ink)]'
                  : 'px-3 py-1 text-sm text-[var(--color-ink-muted)]'
              }
            >
              {option === 'board' ? 'Board' : 'List'}
            </button>
          ))}
        </div>

        {canManage ? (
          <Button onClick={() => setAdding(!adding)}>{adding ? 'Close' : 'Add task'}</Button>
        ) : null}
      </div>

      {adding ? (
        <Card>
          <CardSection title="New task">
            <form action={formAction} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="projectId" value={projectId} />

              <div className="sm:col-span-2">
                <Field label="Title">
                  <Input name="title" required autoFocus />
                </Field>
              </div>

              <Field label="Assign to">
                <Select name="assigneeIds" defaultValue="">
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Priority">
                <Select name="priority" defaultValue="normal">
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </Select>
              </Field>

              <Field label="Due date">
                <Input name="dueDate" type="date" />
              </Field>

              <Field label="Estimate" hint="Hours">
                <Input name="estimateHours" type="number" step="0.5" min="0" />
              </Field>

              <div className="sm:col-span-2">
                {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
                <Button type="submit" disabled={pending} className="mt-1">
                  {pending ? 'Creating' : 'Create task'}
                </Button>
              </div>
            </form>
          </CardSection>
        </Card>
      ) : null}

      {view === 'board' ? (
        // A phone cannot show four columns at once, so the board scrolls sideways rather than
        // squeezing every card into an unreadable strip.
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(15rem, 1fr))` }}
          >
            {columns.map((column) => {
              const inColumn = tasks.filter((task) => task.status === column.name);

              return (
                <div key={column.name} className="min-w-0">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-xs font-medium tracking-wide text-[var(--color-ink-subtle)] uppercase">
                      {column.name}
                    </h2>
                    <span className="text-xs text-[var(--color-ink-subtle)]">
                      {inColumn.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {inColumn.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        projectId={projectId}
                        columns={columns}
                        canManage={canManage}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Card>
          {tasks.length === 0 ? (
            <EmptyState message="No tasks in this project yet." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Number</Th>
                  <Th>Task</Th>
                  <Th>Status</Th>
                  <Th>Assigned</Th>
                  <Th>Due</Th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <Td className="font-mono text-xs text-[var(--color-ink-muted)]">
                      {task.number}
                    </Td>
                    <Td>
                      <Link
                        href={`/tasks/${task.id}`}
                        className="font-medium text-[var(--color-ink)] underline-offset-4 hover:underline"
                      >
                        {task.title}
                      </Link>
                    </Td>
                    <Td className="text-[var(--color-ink-muted)]">{task.status}</Td>
                    <Td className="text-[var(--color-ink-muted)]">
                      {task.assigneeNames.join(', ') || 'Unassigned'}
                    </Td>
                    <Td>
                      {task.dueDate ? (
                        <span
                          className={
                            task.isOverdue
                              ? 'text-[var(--color-status-alert)]'
                              : 'text-[var(--color-ink-muted)]'
                          }
                        >
                          {task.dueDate.toLocaleDateString('en-GB')}
                        </span>
                      ) : (
                        <span className="text-[var(--color-ink-subtle)]">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}

function TaskCard({
  task,
  projectId,
  columns,
  canManage,
}: {
  task: TaskSummary;
  projectId: string;
  columns: { name: string }[];
  canManage: boolean;
}) {
  return (
    <Card className="p-3">
      <Link
        href={`/tasks/${task.id}`}
        className="block text-sm font-medium text-[var(--color-ink)] underline-offset-4 hover:underline"
      >
        {task.title}
      </Link>

      <p className="mt-1 font-mono text-xs text-[var(--color-ink-subtle)]">{task.number}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {task.priority !== 'normal' ? (
          <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
        ) : null}

        {task.isOverdue ? <Badge tone="alert">overdue</Badge> : null}

        {task.stepCount > 0 ? (
          <span className="text-xs text-[var(--color-ink-subtle)]">
            {task.stepsDone}/{task.stepCount} steps
          </span>
        ) : null}

        {task.documentCount > 0 ? (
          <span className="text-xs text-[var(--color-ink-subtle)]">{task.documentCount} docs</span>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
        {task.assigneeNames.join(', ') || 'Unassigned'}
        {task.dueDate ? ` · due ${task.dueDate.toLocaleDateString('en-GB')}` : ''}
      </p>

      {canManage ? (
        <form action={moveTaskAction} className="mt-2">
          <input type="hidden" name="id" value={task.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <Select
            name="status"
            defaultValue={task.status}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            className="text-xs"
            aria-label="Move to column"
          >
            {columns.map((column) => (
              <option key={column.name} value={column.name}>
                {column.name}
              </option>
            ))}
          </Select>
        </form>
      ) : null}
    </Card>
  );
}
