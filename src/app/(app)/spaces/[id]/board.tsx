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
import { Chip, StatusDot, StatusPill } from '@/components/ui/pill';
import { formatDateTime } from '@/modules/tasks/dates';
import { formatMinutes } from '@/modules/time/week';
import type { TaskSummary } from '@/modules/tasks/services/task.service';
import { Gantt } from './gantt';
import { ViewTabs } from './view-tabs';
import { FolderBar } from './folder-bar';
import { Toolbar } from './toolbar';
import {
  AssigneePicker,
  CalendarIcon,
  PriorityPicker,
  SchedulePicker,
  StatusPicker,
} from '@/components/tasks/inline-edit';
import { TaskPanel, type PanelHandlers } from '@/components/tasks/task-panel';
import { QuickAdd } from '@/components/tasks/quick-add';
import {
  addSubtaskInlineAction,
  createTaskAction,
  quickAddTaskAction,
  patchTaskAction,
  setSubtaskDoneAction,
  setSubtaskAssigneeAction,
  reorderTaskAction,
  type TaskFormState,
} from '../../tasks/actions';

const initialState: TaskFormState = {};

/**
 * Board, list and Gantt in one component, because they show the same data and switching should not
 * reload the page.
 *
 * Every view edits in place. Dragging is the fast path for moving work along, and the pickers on
 * each row and card are the reliable one: they work with a keyboard, with a screen reader and on a
 * phone, where dragging between columns that do not fit on screen is miserable. Both go through
 * the same actions, and both show the change before the server answers.
 */

interface DragState {
  taskId: string;
  fromStatus: string;
}

export type SpaceView = 'board' | 'list' | 'gantt';

export interface FolderChoice {
  id: string;
  name: string;
  isPrivate: boolean;
  memberIds: string[];
  memberNames: string[];
}

type OptimisticChange =
  | { kind: 'move'; taskId: string; status: string; index: number }
  | { kind: 'patch'; taskId: string; patch: Partial<TaskSummary> };

interface EditHandlers extends PanelHandlers {
  onQuickAdd: (status: string, title: string) => Promise<string | null>;
}

export function Board({
  spaceId,
  columns,
  folders,
  activeFolderId,
  tasks,
  users,
  canManage,
  initialView,
}: {
  spaceId: string;
  columns: { name: string; isClosed: boolean }[];
  folders: FolderChoice[];
  activeFolderId: string | null;
  tasks: TaskSummary[];
  users: { id: string; name: string }[];
  canManage: boolean;
  initialView: SpaceView;
}) {
  const [view, setView] = useState<SpaceView>(initialView);
  const [adding, setAdding] = useState(false);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [search, setSearch] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(activeFolderId);
  const [state, formAction, pending] = useActionState(createTaskAction, initialState);
  const [, startTransition] = useTransition();
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<{ status: string; index: number } | null>(null);

  /**
   * Every view shows the change immediately and the server catches up. Waiting for a round trip
   * before a card lands, or before a date appears, makes the tool feel broken even when it is
   * working perfectly.
   */
  const [ordered, applyChange] = useOptimistic(tasks, (current, change: OptimisticChange) => {
    if (change.kind === 'patch') {
      return current.map((task) =>
        task.id === change.taskId ? { ...task, ...change.patch } : task,
      );
    }

    const moving = current.find((task) => task.id === change.taskId);
    if (!moving) return current;

    const without = current.filter((task) => task.id !== change.taskId);
    const inColumn = without.filter((task) => task.status === change.status);
    const elsewhere = without.filter((task) => task.status !== change.status);

    inColumn.splice(change.index, 0, { ...moving, status: change.status });

    return [...elsewhere, ...inColumn];
  });

  const nameOf = new Map(users.map((user) => [user.id, user.name]));

  const inFolder = folderId ? ordered.filter((task) => task.folderId === folderId) : ordered;

  const folderCounts: Record<string, number> = { all: ordered.filter((t) => !t.isClosed).length };
  for (const folder of folders) {
    folderCounts[folder.id] = ordered.filter(
      (task) => task.folderId === folder.id && !task.isClosed,
    ).length;
  }

  const visible = inFolder.filter((task) => {
    if (!showClosed && task.isClosed) return false;

    if (assigneeFilter) {
      const name = nameOf.get(assigneeFilter);
      if (!name || !task.assigneeNames.includes(name)) return false;
    }

    if (search.trim()) {
      const text = `${task.number} ${task.title} ${task.folderName ?? ''}`.toLowerCase();
      if (!text.includes(search.trim().toLowerCase())) return false;
    }

    return true;
  });

  const columnTasks = (status: string) => visible.filter((task) => task.status === status);

  // Read from the optimistic list rather than held in state, so an edit made inside the panel is
  // the same object the board is showing behind it.
  const openTask = openTaskId ? (ordered.find((task) => task.id === openTaskId) ?? null) : null;

  function patch(
    taskId: string,
    optimistic: Partial<TaskSummary>,
    sent: Parameters<typeof patchTaskAction>[0],
  ) {
    setEditError(null);

    startTransition(async () => {
      applyChange({ kind: 'patch', taskId, patch: optimistic });

      const result = await patchTaskAction(sent);
      if (result.error) setEditError(result.error);
    });
  }

  const handlers: EditHandlers = {
    users,
    columnsFor: () => columns,
    canManage,
    onPriority: (task, priority) =>
      patch(task.id, { priority }, { id: task.id, spaceId, priority }),
    onSchedule: (task, value) =>
      patch(
        task.id,
        {
          startAt: value.startAt ? new Date(value.startAt) : null,
          endAt: value.endAt ? new Date(value.endAt) : null,
          isOverdue: !!value.endAt && new Date(value.endAt) < new Date() && !task.isClosed,
        },
        { id: task.id, spaceId, startAt: value.startAt, endAt: value.endAt },
      ),
    onAssignees: (task, ids) =>
      patch(
        task.id,
        {
          assigneeIds: ids,
          assigneeNames: ids.map((id) => nameOf.get(id) ?? 'Unknown'),
        },
        { id: task.id, spaceId, assigneeIds: ids },
      ),
    onStatus: (task, status) => {
      const target = columnTasks(status).filter((candidate) => candidate.id !== task.id);

      setEditError(null);

      startTransition(async () => {
        applyChange({ kind: 'move', taskId: task.id, status, index: target.length });

        await reorderTaskAction({
          id: task.id,
          spaceId,
          status,
          afterTaskId: target[target.length - 1]?.id ?? null,
          beforeTaskId: null,
        });
      });
    },
    onQuickAdd: async (status, title) => {
      setEditError(null);

      const result = await quickAddTaskAction({ spaceId, title, status, folderId });
      return result.error ?? null;
    },
    onRename: (task, title) => patch(task.id, { title }, { id: task.id, spaceId, title }),
    onDescribe: (task, description) =>
      patch(task.id, {}, { id: task.id, spaceId, description: description || null }),
    onOpen: (task) => setOpenTaskId(task.id),
    onAddSubtask: async (task, title) => {
      setEditError(null);

      const result = await addSubtaskInlineAction({ taskId: task.id, title, spaceId });
      return result.error ?? null;
    },
    onSubtask: (task, subtaskId, done) => {
      setEditError(null);

      startTransition(async () => {
        applyChange({
          kind: 'patch',
          taskId: task.id,
          patch: {
            subtasks: task.subtasks.map((subtask) =>
              subtask.id === subtaskId ? { ...subtask, done } : subtask,
            ),
            subtasksDone: task.subtasksDone + (done ? 1 : -1),
          },
        });

        await setSubtaskDoneAction({ taskId: task.id, subtaskId, done, spaceId });
      });
    },
    onSubtaskAssignee: (task, subtaskId, assigneeId) => {
      setEditError(null);

      startTransition(async () => {
        applyChange({
          kind: 'patch',
          taskId: task.id,
          patch: {
            subtasks: task.subtasks.map((subtask) =>
              subtask.id === subtaskId ? { ...subtask, assigneeId } : subtask,
            ),
          },
        });

        const result = await setSubtaskAssigneeAction({
          taskId: task.id,
          subtaskId,
          assigneeId,
          spaceId,
        });
        if (result.error) setEditError(result.error);
      });
    },
  };

  function drop(status: string, index: number) {
    if (!dragging || !canManage) return;

    const inColumn = columnTasks(status).filter((task) => task.id !== dragging.taskId);
    const afterTaskId = index > 0 ? (inColumn[index - 1]?.id ?? null) : null;
    const beforeTaskId = inColumn[index]?.id ?? null;

    const taskId = dragging.taskId;

    setDragging(null);
    setDropTarget(null);

    startTransition(async () => {
      applyChange({ kind: 'move', taskId, status, index });

      await reorderTaskAction({ id: taskId, spaceId, status, afterTaskId, beforeTaskId });
    });
  }

  return (
    <div className="space-y-4">
      <FolderBar
        spaceId={spaceId}
        folders={folders}
        activeFolderId={folderId}
        onSelect={setFolderId}
        canManage={canManage}
        counts={folderCounts}
      />

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

      {editError ? <Notice tone="alert">{editError}</Notice> : null}

      {adding ? (
        <Card>
          <CardSection title="New task">
            <form action={formAction} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="spaceId" value={spaceId} />

              <div className="sm:col-span-2">
                <Field label="Title">
                  <Input name="title" required autoFocus />
                </Field>
              </div>

              <Field label="Assign to" hint="Hold command to choose more than one">
                <select name="assigneeIds" multiple className="h-28 w-full rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-ink)]">
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
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

              {folders.length > 0 ? (
                <Field label="Folder">
                  <Select name="folderId" defaultValue={activeFolderId ?? ''}>
                    <option value="">No folder</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.isPrivate ? `${folder.name} (private)` : folder.name}
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
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(16rem, 1fr))` }}
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
                          handlers={handlers}
                          isClosedColumn={column.isClosed}
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

                    {inColumn.length === 0 && !canManage ? (
                      <p className="px-2 py-6 text-center text-xs text-[var(--color-ink-subtle)]">
                        Nothing here
                      </p>
                    ) : null}

                    {canManage ? (
                      <QuickAdd
                        status={column.name}
                        onAdd={(title) => handlers.onQuickAdd(column.name, title)}
                      />
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
          handlers={handlers}
          dragging={dragging}
          onDragStart={(taskId, status) => setDragging({ taskId, fromStatus: status })}
          onDragEnd={() => setDragging(null)}
          onDropOn={(status, index) => drop(status, index)}
        />
      ) : null}

      {openTask ? (
        <TaskPanel
          key={openTask.id}
          task={openTask}
          handlers={handlers}
          onClose={() => setOpenTaskId(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * A card.
 *
 * The status dot, the people, the date and the flag are all live: clicking any of them opens a
 * small menu and the change is saved. That is the difference between a board you look at and a
 * board you plan on.
 */
function TaskCard({
  task,
  handlers,
  isClosedColumn,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  task: TaskSummary;
  handlers: EditHandlers;
  isClosedColumn: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const { canManage, users } = handlers;
  const columns = handlers.columnsFor(task);

  return (
    <Card
      className={clsx(
        'group p-3 transition-opacity',
        canManage && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
      )}
      draggable={canManage}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-start gap-2">
        <StatusPicker
          status={task.status}
          columns={columns}
          disabled={!canManage}
          onChange={(status) => handlers.onStatus(task, status)}
          trigger={<StatusDot status={task.status} isClosed={isClosedColumn} className="mt-0.5" />}
        />

        <button
          type="button"
          onClick={() => handlers.onOpen(task)}
          className="block flex-1 text-left text-sm font-medium text-[var(--color-ink)] underline-offset-4 hover:underline"
        >
          {task.title}
        </button>

        <Link
          href={`/tasks/${task.id}`}
          aria-label={`Open ${task.number} on its own page`}
          className="font-mono text-[10px] text-[var(--color-ink-subtle)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--color-ink)]"
        >
          {task.number.split('-').pop()}
        </Link>
      </div>

      {task.folderName || task.isOverdue || task.subtaskCount > 0 || task.plannedMinutes ? (
        <div className="mt-2 flex flex-wrap items-center gap-1 pl-4">
          {task.isOverdue ? <Chip tone="alert">overdue</Chip> : null}

          {task.folderName ? <Chip>{task.folderName}</Chip> : null}

          {task.subtaskCount > 0 ? (
            <Chip title="Subtasks done">
              {task.subtasksDone}/{task.subtaskCount}
            </Chip>
          ) : null}

          {task.plannedMinutes ? (
            <Chip title="Planned working hours">{formatMinutes(task.plannedMinutes)}</Chip>
          ) : null}
        </div>
      ) : null}

      <div className="mt-2 flex items-center gap-1 pl-3">
        <AssigneePicker
          users={users}
          selectedIds={task.assigneeIds}
          disabled={!canManage}
          onChange={(ids) => handlers.onAssignees(task, ids)}
        />

        <SchedulePicker
          startAt={task.startAt}
          endAt={task.endAt}
          disabled={!canManage}
          onChange={(value) => handlers.onSchedule(task, value)}
          trigger={
            <span
              className={clsx(
                'flex items-center gap-1 text-[11px]',
                task.endAt
                  ? task.isOverdue
                    ? 'text-[var(--color-status-alert)]'
                    : 'text-[var(--color-ink-muted)]'
                  : 'text-[var(--color-ink-subtle)]',
              )}
            >
              <CalendarIcon />
              {task.endAt ? formatDateTime(task.endAt) : 'Set date'}
            </span>
          }
        />

        <span className="ml-auto">
          <PriorityPicker
            priority={task.priority}
            disabled={!canManage}
            onChange={(priority) => handlers.onPriority(task, priority)}
          />
        </span>
      </div>
    </Card>
  );
}

/**
 * The list view: grouped by column, with real columns.
 *
 * A task list is a table, and people read a table by column. Name, who, when and priority sit in
 * fixed positions so the eye runs down one of them rather than reading every row as a sentence.
 * Every one of those cells is editable in place, and a row with subtasks opens to show them, so a
 * whole space can be planned without leaving this screen.
 */
function ListView({
  tasks,
  columns,
  handlers,
  dragging,
  onDragStart,
  onDragEnd,
  onDropOn,
}: {
  tasks: TaskSummary[];
  columns: { name: string; isClosed: boolean }[];
  handlers: EditHandlers;
  dragging: DragState | null;
  onDragStart: (taskId: string, status: string) => void;
  onDragEnd: () => void;
  onDropOn: (status: string, index: number) => void;
}) {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const { canManage, users } = handlers;

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
              <Caret
                open={open}
                label={`${open ? 'Collapse' : 'Expand'} ${column.name}`}
                onClick={() =>
                  setCollapsed((current) =>
                    open
                      ? [...current, column.name]
                      : current.filter((name) => name !== column.name),
                  )
                }
              />

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
                        <th className="w-24 border-b border-[var(--color-line)] px-2 py-1.5 text-left font-medium">
                          Priority
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {inColumn.map((task, index) => {
                        const isOpen = expanded.includes(task.id);

                        return (
                          <Row key={task.id}>
                            <tr
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
                                'group border-b border-[var(--color-line)] hover:bg-[var(--color-surface-muted)]/60',
                                canManage && 'cursor-grab active:cursor-grabbing',
                              )}
                            >
                              <td className="px-2 py-2 align-middle">
                                {task.subtaskCount > 0 ? (
                                  <Caret
                                    open={isOpen}
                                    label={`${isOpen ? 'Hide' : 'Show'} subtasks of ${task.title}`}
                                    onClick={() =>
                                      setExpanded((current) =>
                                        isOpen
                                          ? current.filter((id) => id !== task.id)
                                          : [...current, task.id],
                                      )
                                    }
                                  />
                                ) : (
                                  <Link
                                    href={`/tasks/${task.id}`}
                                    aria-label={`Open ${task.number} on its own page`}
                                    className="font-mono text-[10px] text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
                                  >
                                    {task.number.split('-').pop()}
                                  </Link>
                                )}
                              </td>

                              <td className="px-2 py-2 align-middle">
                                <div className="flex items-center gap-2">
                                  <StatusPicker
                                    status={task.status}
                                    columns={columns}
                                    disabled={!canManage}
                                    onChange={(status) => handlers.onStatus(task, status)}
                                    trigger={
                                      <StatusDot status={task.status} isClosed={column.isClosed} />
                                    }
                                  />

                                  <button
                                    type="button"
                                    onClick={() => handlers.onOpen(task)}
                                    className="truncate text-left font-medium text-[var(--color-ink)] underline-offset-4 group-hover:underline"
                                  >
                                    {task.title}
                                  </button>

                                  {task.subtaskCount > 0 ? (
                                    <Chip title="Subtasks done">
                                      {task.subtasksDone}/{task.subtaskCount}
                                    </Chip>
                                  ) : null}

                                  {task.folderName ? <Chip>{task.folderName}</Chip> : null}
                                </div>
                              </td>

                              <td className="px-2 py-2 align-middle">
                                <AssigneePicker
                                  users={users}
                                  selectedIds={task.assigneeIds}
                                  disabled={!canManage}
                                  onChange={(ids) => handlers.onAssignees(task, ids)}
                                />
                              </td>

                              <td className="px-2 py-2 align-middle">
                                <SchedulePicker
                                  startAt={task.startAt}
                                  endAt={task.endAt}
                                  disabled={!canManage}
                                  onChange={(value) => handlers.onSchedule(task, value)}
                                  trigger={
                                    <span
                                      className={clsx(
                                        'text-[12px] tabular-nums',
                                        task.endAt
                                          ? task.isOverdue
                                            ? 'text-[var(--color-status-alert)]'
                                            : 'text-[var(--color-ink-muted)]'
                                          : 'text-[var(--color-ink-subtle)]',
                                      )}
                                    >
                                      {task.endAt ? formatDateTime(task.endAt) : 'Set date'}
                                    </span>
                                  }
                                />
                              </td>

                              <td className="px-2 py-2 align-middle text-[12px] text-[var(--color-ink-muted)] tabular-nums">
                                {task.plannedMinutes ? formatMinutes(task.plannedMinutes) : '—'}
                              </td>

                              <td className="px-2 py-2 align-middle">
                                <span className="flex items-center gap-1">
                                  <PriorityPicker
                                    priority={task.priority}
                                    disabled={!canManage}
                                    onChange={(priority) => handlers.onPriority(task, priority)}
                                  />
                                  <span className="text-[12px] text-[var(--color-ink-muted)] capitalize">
                                    {task.priority}
                                  </span>
                                </span>
                              </td>
                            </tr>

                            {isOpen
                              ? task.subtasks.map((subtask) => (
                                  <tr
                                    key={subtask.id}
                                    className="border-b border-[var(--color-line)] bg-[var(--color-surface-sunken)]/40"
                                  >
                                    <td />
                                    <td colSpan={5} className="px-2 py-1.5">
                                      <label className="flex items-center gap-2 pl-4 text-[13px]">
                                        <input
                                          type="checkbox"
                                          checked={subtask.done}
                                          disabled={!canManage}
                                          onChange={(event) =>
                                            handlers.onSubtask(
                                              task,
                                              subtask.id,
                                              event.target.checked,
                                            )
                                          }
                                          className="h-3.5 w-3.5 rounded border-[var(--color-line-strong)]"
                                        />
                                        <span
                                          className={clsx(
                                            subtask.done
                                              ? 'text-[var(--color-ink-subtle)] line-through'
                                              : 'text-[var(--color-ink-muted)]',
                                          )}
                                        >
                                          {subtask.title}
                                        </span>
                                      </label>
                                    </td>
                                  </tr>
                                ))
                              : null}
                          </Row>
                        );
                      })}

                      {inColumn.length === 0 && !canManage ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-3 py-3 text-center text-xs text-[var(--color-ink-subtle)]"
                          >
                            Nothing here
                          </td>
                        </tr>
                      ) : null}

                      {canManage ? (
                        <tr>
                          <td />
                          <td colSpan={5}>
                            <QuickAdd
                              status={column.name}
                              variant="row"
                              onAdd={(title) => handlers.onQuickAdd(column.name, title)}
                            />
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
    </div>
  );
}

/** A task and its subtask rows are siblings in one tbody, so they are grouped by a fragment. */
function Row({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Caret({ open, label, onClick }: { open: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={label}
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
  );
}
