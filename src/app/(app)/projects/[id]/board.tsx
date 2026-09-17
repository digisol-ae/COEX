'use client';

import Link from 'next/link';
import { useActionState, useOptimistic, useState, useTransition } from 'react';
import { clsx } from 'clsx';
import {
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
import { Chip, PriorityFlag, StatusPill } from '@/components/ui/pill';
import { formatDateTime } from '@/modules/tasks/dates';
import { formatMinutes } from '@/modules/time/week';
import type { TaskSummary } from '@/modules/tasks/services/task.service';
import { Gantt } from './gantt';
import { ViewTabs } from './view-tabs';
import { Toolbar } from './toolbar';
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

interface DragState {
  taskId: string;
  fromStatus: string;
}

export type ProjectView = 'board' | 'list' | 'gantt';

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
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [search, setSearch] = useState('');
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

  const nameOf = new Map(users.map((user) => [user.id, user.name]));

  const visible = ordered.filter((task) => {
    if (!showClosed && task.isClosed) return false;

    if (assigneeFilter) {
      const name = nameOf.get(assigneeFilter);
      if (!name || !task.assigneeNames.includes(name)) return false;
    }

    if (search.trim()) {
      const text = `${task.number} ${task.title} ${task.phase ?? ''}`.toLowerCase();
      if (!text.includes(search.trim().toLowerCase())) return false;
    }

    return true;
  });

  const columnTasks = (status: string) => visible.filter((task) => task.status === status);

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
      <ViewTabs view={view} onChange={setView} />

      <Toolbar
        users={users}
        assigneeId={assigneeFilter}
        onAssignee={setAssigneeFilter}
        showClosed={showClosed}
        onShowClosed={setShowClosed}
        search={search}
        onSearch={setSearch}
        action={
          canManage ? (
            <Button onClick={() => setAdding(!adding)}>{adding ? 'Close' : 'Add task'}</Button>
          ) : null
        }
      />

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

      {view === 'gantt' ? <Gantt tasks={visible} /> : null}

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
                  <div className="mb-2 flex items-center gap-2">
                    <StatusPill status={column.name} isClosed={column.isClosed} />
                    <span className="text-xs text-[var(--color-ink-subtle)] tabular-nums">
                      {inColumn.length}
                    </span>

                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => setAdding(true)}
                        aria-label={`Add a task to ${column.name}`}
                        className="ml-auto flex h-6 w-6 items-center justify-center rounded text-[var(--color-ink-subtle)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M6 2.5v7M2.5 6h7"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    ) : null}
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
          tasks={visible}
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
      <div className="flex items-start gap-2">
        <PriorityFlag priority={task.priority} />

        <Link
          href={`/tasks/${task.id}`}
          className="block flex-1 text-sm font-medium text-[var(--color-ink)] underline-offset-4 hover:underline"
        >
          {task.title}
        </Link>
      </div>

      <p className="mt-1 font-mono text-[11px] text-[var(--color-ink-subtle)]">{task.number}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        {task.isOverdue ? <Chip tone="alert">overdue</Chip> : null}

        {task.phase ? <Chip>{task.phase}</Chip> : null}

        {task.subtaskCount > 0 ? (
          <Chip title="Subtasks done">
            {task.subtasksDone}/{task.subtaskCount}
          </Chip>
        ) : null}

        {task.plannedMinutes ? (
          <Chip title="Planned working hours">{formatMinutes(task.plannedMinutes)}</Chip>
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

/**
 * The list view: grouped by column, with real columns.
 *
 * A task list is a table, and people read a table by column. Name, who, when and priority sit in
 * fixed positions so the eye runs down one of them rather than reading every row as a sentence.
 * Each group carries its count and its own add row, because the intent when you are looking at
 * To do is almost always to add another one.
 */
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
  const [collapsed, setCollapsed] = useState<string[]>([]);

  if (tasks.length === 0) {
    return (
      <Card>
        <EmptyState message="No tasks here. Add one, or widen the filters above." />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {columns.map((column) => {
        const inColumn = tasks.filter((task) => task.status === column.name);
        const open = !collapsed.includes(column.name);

        return (
          <div key={column.name}>
            <div className="flex items-center gap-2 py-1.5">
              <button
                type="button"
                onClick={() =>
                  setCollapsed((current) =>
                    open
                      ? [...current, column.name]
                      : current.filter((name) => name !== column.name),
                  )
                }
                aria-expanded={open}
                aria-label={`${open ? 'Collapse' : 'Expand'} ${column.name}`}
                className="flex h-5 w-5 items-center justify-center text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                  className={clsx('transition-transform', open ? 'rotate-90' : '')}
                >
                  <path
                    d="M4.5 2.5L8 6l-3.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <StatusPill status={column.name} isClosed={column.isClosed} />
              <span className="text-xs text-[var(--color-ink-subtle)] tabular-nums">
                {inColumn.length}
              </span>
            </div>

            {open ? (
              <Card>
                <div
                  onDragOver={(event) => dragging && event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    onDropOn(column.name, inColumn.length);
                  }}
                >
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="text-[11px] tracking-wide text-[var(--color-ink-subtle)] uppercase">
                        <th className="w-6 border-b border-[var(--color-line)] px-2 py-1.5" />
                        <th className="border-b border-[var(--color-line)] px-2 py-1.5 text-left font-medium">
                          Name
                        </th>
                        <th className="w-24 border-b border-[var(--color-line)] px-2 py-1.5 text-left font-medium">
                          Who
                        </th>
                        <th className="w-40 border-b border-[var(--color-line)] px-2 py-1.5 text-left font-medium">
                          Ends
                        </th>
                        <th className="w-24 border-b border-[var(--color-line)] px-2 py-1.5 text-left font-medium">
                          Planned
                        </th>
                        <th className="w-20 border-b border-[var(--color-line)] px-2 py-1.5 text-left font-medium">
                          Priority
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {inColumn.map((task, index) => (
                        <tr
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
                            'group border-b border-[var(--color-line)] last:border-b-0 hover:bg-[var(--color-surface-muted)]/60',
                            canManage && 'cursor-grab active:cursor-grabbing',
                          )}
                        >
                          <td className="px-2 py-2 align-middle">
                            <span className="font-mono text-[10px] text-[var(--color-ink-subtle)]">
                              {task.number.split('-').pop()}
                            </span>
                          </td>

                          <td className="px-2 py-2 align-middle">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/tasks/${task.id}`}
                                className="truncate font-medium text-[var(--color-ink)] underline-offset-4 group-hover:underline"
                              >
                                {task.title}
                              </Link>

                              {task.subtaskCount > 0 ? (
                                <Chip title="Subtasks done">
                                  {task.subtasksDone}/{task.subtaskCount}
                                </Chip>
                              ) : null}

                              {task.phase ? <Chip>{task.phase}</Chip> : null}
                            </div>
                          </td>

                          <td className="px-2 py-2 align-middle">
                            {task.assigneeNames.length ? (
                              <div className="flex -space-x-1.5">
                                {task.assigneeNames.map((name) => (
                                  <Avatar key={name} name={name} size="small" />
                                ))}
                              </div>
                            ) : (
                              <span className="text-[11px] text-[var(--color-ink-subtle)]">
                                Unassigned
                              </span>
                            )}
                          </td>

                          <td className="px-2 py-2 align-middle">
                            {task.endAt ? (
                              <span
                                className={clsx(
                                  'text-[12px] tabular-nums',
                                  task.isOverdue
                                    ? 'text-[var(--color-status-alert)]'
                                    : 'text-[var(--color-ink-muted)]',
                                )}
                              >
                                {formatDateTime(task.endAt)}
                              </span>
                            ) : (
                              <span className="text-[var(--color-ink-subtle)]">—</span>
                            )}
                          </td>

                          <td className="px-2 py-2 align-middle text-[12px] text-[var(--color-ink-muted)] tabular-nums">
                            {task.plannedMinutes ? formatMinutes(task.plannedMinutes) : '—'}
                          </td>

                          <td className="px-2 py-2 align-middle">
                            <div className="flex items-center gap-1.5">
                              <PriorityFlag priority={task.priority} />
                              <span className="text-[12px] text-[var(--color-ink-muted)] capitalize">
                                {task.priority}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {inColumn.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-3 py-3 text-center text-xs text-[var(--color-ink-subtle)]"
                          >
                            {canManage
                              ? 'Nothing here. Drop a task in, or add one.'
                              : 'Nothing here'}
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : null}
          </div>
        );
      })}

      <input type="hidden" value={projectId} readOnly />
    </div>
  );
}
