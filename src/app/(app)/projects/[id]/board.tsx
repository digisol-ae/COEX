'use client';

import Link from 'next/link';
import { useActionState, useOptimistic, useState, useTransition } from 'react';
import { clsx } from 'clsx';
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
} from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { formatDateTime } from '@/modules/tasks/dates';
import { formatMinutes } from '@/modules/time/week';
import type { TaskSummary } from '@/modules/tasks/services/task.service';
import { Gantt } from './gantt';
import {
  createTaskAction,
  moveTaskAction,
  reorderTaskAction,
  type TaskFormState,
} from '../../tasks/actions';

const initialState: TaskFormState = {};

/**
 * Board and list in one component, because they show the same data and the toggle should not
 * reload the page.
 *
 * Dragging is the fast path, and the column dropdown on every card stays as the reliable one: it
 * works with a keyboard, with a screen reader and on a phone, where dragging between columns that
 * do not fit on screen is miserable. Both go through the same action.
 */

const PRIORITY_TONE = {
  urgent: 'alert',
  high: 'warn',
  normal: 'neutral',
  low: 'neutral',
} as const;

interface DragState {
  taskId: string;
  fromStatus: string;
}

export type ProjectView = 'board' | 'list' | 'gantt';

const VIEWS: { id: ProjectView; label: string }[] = [
  { id: 'board', label: 'Board' },
  { id: 'list', label: 'List' },
  { id: 'gantt', label: 'Gantt' },
];

export function Board({
  projectId,
  columns,
  phases,
  tasks,
  users,
  canManage,
  initialView,
}: {
  projectId: string;
  columns: { name: string; isClosed: boolean }[];
  phases: string[];
  tasks: TaskSummary[];
  users: { id: string; name: string }[];
  canManage: boolean;
  initialView: ProjectView;
}) {
  const [view, setView] = useState<ProjectView>(initialView);
  const [adding, setAdding] = useState(false);
  const [state, formAction, pending] = useActionState(createTaskAction, initialState);
  const [, startTransition] = useTransition();
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<{ status: string; index: number } | null>(null);

  /**
   * The board shows the move immediately and the server catches up. Waiting for a round trip
   * before the card lands makes dragging feel broken even when it is working.
   */
  const [ordered, applyMove] = useOptimistic(
    tasks,
    (current, move: { taskId: string; status: string; index: number }) => {
      const moving = current.find((task) => task.id === move.taskId);
      if (!moving) return current;

      const without = current.filter((task) => task.id !== move.taskId);
      const inColumn = without.filter((task) => task.status === move.status);
      const elsewhere = without.filter((task) => task.status !== move.status);

      inColumn.splice(move.index, 0, { ...moving, status: move.status });

      return [...elsewhere, ...inColumn];
    },
  );

  const columnTasks = (status: string) => ordered.filter((task) => task.status === status);

  function drop(status: string, index: number) {
    if (!dragging || !canManage) return;

    const inColumn = columnTasks(status).filter((task) => task.id !== dragging.taskId);
    const afterTaskId = index > 0 ? (inColumn[index - 1]?.id ?? null) : null;
    const beforeTaskId = inColumn[index]?.id ?? null;

    const taskId = dragging.taskId;

    setDragging(null);
    setDropTarget(null);

    startTransition(async () => {
      applyMove({ taskId, status, index });

      await reorderTaskAction({ id: taskId, projectId, status, afterTaskId, beforeTaskId });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] p-1">
          {VIEWS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setView(option.id)}
              className={
                view === option.id
                  ? 'rounded-[var(--radius-control)] bg-[var(--color-surface)] px-3 py-1 text-sm font-medium text-[var(--color-ink)]'
                  : 'px-3 py-1 text-sm text-[var(--color-ink-muted)]'
              }
            >
              {option.label}
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

              <Field label="Starts">
                <Input name="startAt" type="datetime-local" />
              </Field>

              <Field label="Ends" hint="Also the deadline">
                <Input name="endAt" type="datetime-local" />
              </Field>

              {phases.length > 0 ? (
                <Field label="Phase">
                  <Select name="phase" defaultValue="">
                    <option value="">No phase</option>
                    {phases.map((phase) => (
                      <option key={phase} value={phase}>
                        {phase}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}

              <Field label="Estimate" hint="Hours of effort">
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

      {view === 'gantt' ? <Gantt tasks={ordered} /> : null}

      {view === 'board' ? (
        // A phone cannot show four columns at once, so the board scrolls sideways rather than
        // squeezing every card into an unreadable strip.
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(15rem, 1fr))` }}
          >
            {columns.map((column) => {
              const inColumn = columnTasks(column.name);

              return (
                <div
                  key={column.name}
                  className="min-w-0"
                  onDragOver={(event) => {
                    if (!dragging) return;
                    event.preventDefault();
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    drop(column.name, inColumn.length);
                  }}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-xs font-medium tracking-wide text-[var(--color-ink-subtle)] uppercase">
                      {column.name}
                    </h2>
                    <span className="text-xs text-[var(--color-ink-subtle)]">
                      {inColumn.length}
                    </span>
                  </div>

                  <div
                    className={clsx(
                      'min-h-24 space-y-2 rounded-[var(--radius-card)] p-1 transition-colors',
                      dragging && dropTarget?.status === column.name
                        ? 'bg-[var(--color-surface-muted)]'
                        : 'bg-transparent',
                    )}
                  >
                    {inColumn.map((task, index) => (
                      <div
                        key={task.id}
                        onDragOver={(event) => {
                          if (!dragging) return;
                          event.preventDefault();
                          setDropTarget({ status: column.name, index });
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          drop(column.name, index);
                        }}
                      >
                        {dragging &&
                        dropTarget?.status === column.name &&
                        dropTarget.index === index ? (
                          <div className="mb-2 h-0.5 rounded-full bg-[image:var(--gradient-brand)]" />
                        ) : null}

                        <TaskCard
                          task={task}
                          projectId={projectId}
                          columns={columns}
                          canManage={canManage}
                          onDragStart={() =>
                            setDragging({ taskId: task.id, fromStatus: column.name })
                          }
                          onDragEnd={() => {
                            setDragging(null);
                            setDropTarget(null);
                          }}
                          isDragging={dragging?.taskId === task.id}
                        />
                      </div>
                    ))}

                    {inColumn.length === 0 ? (
                      <p className="px-2 py-6 text-center text-xs text-[var(--color-ink-subtle)]">
                        {canManage ? 'Drop a task here' : 'Nothing here'}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : view === 'list' ? (
        <ListView
          tasks={ordered}
          columns={columns}
          projectId={projectId}
          canManage={canManage}
          dragging={dragging}
          onDragStart={(taskId, status) => setDragging({ taskId, fromStatus: status })}
          onDragEnd={() => setDragging(null)}
          onDropOn={(status, index) => drop(status, index)}
        />
      ) : null}
    </div>
  );
}

function TaskCard({
  task,
  projectId,
  columns,
  canManage,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  task: TaskSummary;
  projectId: string;
  columns: { name: string }[];
  canManage: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  return (
    <Card
      className={clsx(
        'p-3 transition-opacity',
        canManage && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
      draggable={canManage}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
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

        {task.subtaskCount > 0 ? (
          <span className="text-xs text-[var(--color-ink-subtle)]">
            {task.subtasksDone}/{task.subtaskCount} subtasks
          </span>
        ) : null}

        {task.plannedMinutes ? (
          <span className="text-xs text-[var(--color-ink-subtle)]">
            {formatMinutes(task.plannedMinutes)} planned
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex items-center gap-2">
        {task.assigneeNames.length ? (
          <div className="flex -space-x-1.5">
            {task.assigneeNames.map((name) => (
              <Avatar key={name} name={name} size="small" />
            ))}
          </div>
        ) : (
          <span className="text-xs text-[var(--color-ink-subtle)]">Unassigned</span>
        )}

        {task.endAt ? (
          <span
            className={clsx(
              'text-xs',
              task.isOverdue ? 'text-[var(--color-status-alert)]' : 'text-[var(--color-ink-muted)]',
            )}
          >
            {formatDateTime(task.endAt)}
          </span>
        ) : null}
      </div>

      {canManage ? (
        <form action={moveTaskAction} className="mt-2">
          <input type="hidden" name="id" value={task.id} />
          <input type="hidden" name="projectId" value={projectId} />
          <Select
            name="status"
            defaultValue={task.status}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            className="text-xs"
            aria-label={`Move ${task.number} to another column`}
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

/** The list view groups by column, so dragging a row can both reorder and change status. */
function ListView({
  tasks,
  columns,
  projectId,
  canManage,
  dragging,
  onDragStart,
  onDragEnd,
  onDropOn,
}: {
  tasks: TaskSummary[];
  columns: { name: string; isClosed: boolean }[];
  projectId: string;
  canManage: boolean;
  dragging: DragState | null;
  onDragStart: (taskId: string, status: string) => void;
  onDragEnd: () => void;
  onDropOn: (status: string, index: number) => void;
}) {
  if (tasks.length === 0) {
    return (
      <Card>
        <EmptyState message="No tasks in this project yet." />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {columns.map((column) => {
        const inColumn = tasks.filter((task) => task.status === column.name);

        return (
          <Card key={column.name}>
            <CardSection title={`${column.name} · ${inColumn.length}`}>
              <ul
                className="divide-y divide-[var(--color-line)]"
                onDragOver={(event) => dragging && event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  onDropOn(column.name, inColumn.length);
                }}
              >
                {inColumn.map((task, index) => (
                  <li
                    key={task.id}
                    draggable={canManage}
                    onDragStart={() => onDragStart(task.id, column.name)}
                    onDragEnd={onDragEnd}
                    onDragOver={(event) => dragging && event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onDropOn(column.name, index);
                    }}
                    className={clsx(
                      'flex flex-wrap items-center gap-3 py-2.5',
                      canManage && 'cursor-grab active:cursor-grabbing',
                    )}
                  >
                    <span className="font-mono text-xs text-[var(--color-ink-subtle)]">
                      {task.number}
                    </span>

                    <Link
                      href={`/tasks/${task.id}`}
                      className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-ink)] underline-offset-4 hover:underline"
                    >
                      {task.title}
                    </Link>

                    {task.phase ? (
                      <span className="text-xs text-[var(--color-ink-subtle)]">{task.phase}</span>
                    ) : null}

                    {task.plannedMinutes ? (
                      <span className="text-xs text-[var(--color-ink-muted)] tabular-nums">
                        {formatMinutes(task.plannedMinutes)}
                      </span>
                    ) : null}

                    {task.endAt ? (
                      <span
                        className={clsx(
                          'text-xs tabular-nums',
                          task.isOverdue
                            ? 'text-[var(--color-status-alert)]'
                            : 'text-[var(--color-ink-muted)]',
                        )}
                      >
                        {formatDateTime(task.endAt)}
                      </span>
                    ) : null}

                    {task.assigneeNames.length ? (
                      <div className="flex -space-x-1.5">
                        {task.assigneeNames.map((name) => (
                          <Avatar key={name} name={name} size="small" />
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}

                {inColumn.length === 0 ? (
                  <li className="py-4 text-center text-xs text-[var(--color-ink-subtle)]">
                    {canManage ? 'Drop a task here' : 'Nothing here'}
                  </li>
                ) : null}
              </ul>
            </CardSection>
          </Card>
        );
      })}

      <input type="hidden" value={projectId} readOnly />
    </div>
  );
}
