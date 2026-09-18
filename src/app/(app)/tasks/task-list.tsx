'use client';

import Link from 'next/link';
import { useOptimistic, useState, useTransition } from 'react';
import { clsx } from 'clsx';
import { Card, EmptyState, Notice } from '@/components/ui';
import { StatusDot } from '@/components/ui/pill';
import { formatDateTime } from '@/modules/tasks/dates';
import { formatMinutes } from '@/modules/time/week';
import type { TaskSummary } from '@/modules/tasks/services/task.service';
import {
  AssigneePicker,
  CalendarIcon,
  PriorityPicker,
  SchedulePicker,
  StatusPicker,
  type PriorityValue,
} from '@/components/tasks/inline-edit';
import { TaskPanel, type PanelHandlers, type TaskColumn } from '@/components/tasks/task-panel';
import {
  addSubtaskInlineAction,
  patchTaskAction,
  reorderTaskAction,
  setSubtaskDoneAction,
} from './actions';

/**
 * My tasks: one person's work, across every space, grouped by when it is due.
 *
 * A personal list is not a board. Nobody opens this screen asking which column something is in;
 * they open it asking what has to happen today. So the grouping is by deadline, overdue first, and
 * status is a dot you can click rather than a column you have to find.
 *
 * Everything is editable here for the same reason it is editable on a board: a plan that needs a
 * form per change stops being kept up to date within a week.
 */

type Group = 'overdue' | 'today' | 'week' | 'later' | 'none';

const GROUP_LABELS: Record<Group, string> = {
  overdue: 'Overdue',
  today: 'Today',
  week: 'This week',
  later: 'Later',
  none: 'No date',
};

function groupOf(task: TaskSummary, now: Date): Group {
  if (!task.endAt) return 'none';

  const end = new Date(task.endAt);

  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const endOfWeek = new Date(endOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  if (end < now && !task.isClosed) return 'overdue';
  if (end <= endOfToday) return 'today';
  if (end <= endOfWeek) return 'week';

  return 'later';
}

export function TaskList({
  tasks,
  users,
  columnsBySpace,
  canManage,
}: {
  tasks: TaskSummary[];
  users: { id: string; name: string }[];
  columnsBySpace: Record<string, TaskColumn[]>;
  canManage: boolean;
}) {
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const [shown, apply] = useOptimistic(
    tasks,
    (current, change: { taskId: string; patch: Partial<TaskSummary> }) =>
      current.map((task) => (task.id === change.taskId ? { ...task, ...change.patch } : task)),
  );

  const nameOf = new Map(users.map((user) => [user.id, user.name]));

  function patch(
    task: TaskSummary,
    optimistic: Partial<TaskSummary>,
    sent: Parameters<typeof patchTaskAction>[0],
  ) {
    setError(null);

    startTransition(async () => {
      apply({ taskId: task.id, patch: optimistic });

      const result = await patchTaskAction(sent);
      if (result.error) setError(result.error);
    });
  }

  const handlers: PanelHandlers = {
    users,
    canManage,
    columnsFor: (task) => columnsBySpace[task.spaceId] ?? [{ name: task.status, isClosed: false }],
    onOpen: (task) => setOpenTaskId(task.id),
    onPriority: (task, priority: PriorityValue) =>
      patch(task, { priority }, { id: task.id, spaceId: task.spaceId, priority }),
    onSchedule: (task, value) =>
      patch(
        task,
        {
          startAt: value.startAt ? new Date(value.startAt) : null,
          endAt: value.endAt ? new Date(value.endAt) : null,
          isOverdue: !!value.endAt && new Date(value.endAt) < new Date() && !task.isClosed,
        },
        { id: task.id, spaceId: task.spaceId, startAt: value.startAt, endAt: value.endAt },
      ),
    onAssignees: (task, ids) =>
      patch(
        task,
        { assigneeIds: ids, assigneeNames: ids.map((id) => nameOf.get(id) ?? 'Unknown') },
        { id: task.id, spaceId: task.spaceId, assigneeIds: ids },
      ),
    onRename: (task, title) =>
      patch(task, { title }, { id: task.id, spaceId: task.spaceId, title }),
    onDescribe: (task, description) =>
      patch(task, {}, { id: task.id, spaceId: task.spaceId, description: description || null }),
    onStatus: (task, status) => {
      setError(null);

      startTransition(async () => {
        const columns = columnsBySpace[task.spaceId] ?? [];
        const column = columns.find((candidate) => candidate.name === status);

        apply({ taskId: task.id, patch: { status, isClosed: column?.isClosed ?? task.isClosed } });

        await reorderTaskAction({
          id: task.id,
          spaceId: task.spaceId,
          status,
          afterTaskId: null,
          beforeTaskId: null,
        });
      });
    },
    onSubtask: (task, subtaskId, done) => {
      setError(null);

      startTransition(async () => {
        apply({
          taskId: task.id,
          patch: {
            subtasks: task.subtasks.map((subtask) =>
              subtask.id === subtaskId ? { ...subtask, done } : subtask,
            ),
            subtasksDone: task.subtasksDone + (done ? 1 : -1),
          },
        });

        await setSubtaskDoneAction({
          taskId: task.id,
          subtaskId,
          done,
          spaceId: task.spaceId,
        });
      });
    },
    onAddSubtask: async (task, title) => {
      setError(null);

      const result = await addSubtaskInlineAction({
        taskId: task.id,
        title,
        spaceId: task.spaceId,
      });

      return result.error ?? null;
    },
  };

  const now = new Date();
  const openTask = openTaskId ? (shown.find((task) => task.id === openTaskId) ?? null) : null;

  const groups: Group[] = ['overdue', 'today', 'week', 'later', 'none'];

  if (shown.length === 0) {
    return (
      <Card>
        <EmptyState message="Nothing here. Either the work is done or the filters are too narrow." />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {error ? <Notice tone="alert">{error}</Notice> : null}

      {groups.map((group) => {
        const inGroup = shown.filter((task) => groupOf(task, now) === group);
        if (inGroup.length === 0) return null;

        return (
          <div key={group}>
            <div className="flex items-center gap-2 py-1.5">
              <h2
                className={clsx(
                  'text-[11px] font-semibold tracking-[0.06em] uppercase',
                  group === 'overdue'
                    ? 'text-[var(--color-status-alert)]'
                    : 'text-[var(--color-ink-subtle)]',
                )}
              >
                {GROUP_LABELS[group]}
              </h2>
              <span className="text-xs text-[var(--color-ink-subtle)] tabular-nums">
                {inGroup.length}
              </span>
            </div>

            <Card>
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {inGroup.map((task) => (
                    <tr
                      key={task.id}
                      className="group border-b border-[var(--color-line)] last:border-b-0 hover:bg-[var(--color-surface-muted)]/60"
                    >
                      <td className="w-8 px-3 py-2 align-middle">
                        <StatusPicker
                          status={task.status}
                          columns={handlers.columnsFor(task)}
                          disabled={!canManage}
                          onChange={(status) => handlers.onStatus(task, status)}
                          trigger={<StatusDot status={task.status} isClosed={task.isClosed} />}
                        />
                      </td>

                      <td className="px-2 py-2 align-middle">
                        <button
                          type="button"
                          onClick={() => handlers.onOpen(task)}
                          className="block max-w-md truncate text-left font-medium text-[var(--color-ink)] underline-offset-4 group-hover:underline"
                        >
                          {task.title}
                        </button>

                        <span className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--color-ink-subtle)]">
                          <Link
                            href={`/spaces/${task.spaceId}`}
                            className="hover:text-[var(--color-ink)] hover:underline"
                          >
                            {task.spaceName}
                          </Link>
                          {task.folderName ? <span>{task.folderName}</span> : null}
                          {task.subtaskCount > 0 ? (
                            <span>
                              {task.subtasksDone}/{task.subtaskCount} subtasks
                            </span>
                          ) : null}
                          <Link
                            href={`/tasks/${task.id}`}
                            className="font-mono opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--color-ink)]"
                            aria-label={`Open ${task.number} on its own page`}
                          >
                            {task.number}
                          </Link>
                        </span>
                      </td>

                      <td className="w-40 px-2 py-2 align-middle">
                        <SchedulePicker
                          startAt={task.startAt}
                          endAt={task.endAt}
                          disabled={!canManage}
                          onChange={(value) => handlers.onSchedule(task, value)}
                          trigger={
                            <span
                              className={clsx(
                                'flex items-center gap-1 text-[12px] tabular-nums',
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
                      </td>

                      <td className="w-20 px-2 py-2 align-middle text-[12px] text-[var(--color-ink-muted)] tabular-nums">
                        {task.plannedMinutes ? formatMinutes(task.plannedMinutes) : ''}
                      </td>

                      <td className="w-24 px-2 py-2 align-middle">
                        <AssigneePicker
                          users={users}
                          selectedIds={task.assigneeIds}
                          disabled={!canManage}
                          onChange={(ids) => handlers.onAssignees(task, ids)}
                        />
                      </td>

                      <td className="w-10 px-2 py-2 align-middle">
                        <PriorityPicker
                          priority={task.priority}
                          disabled={!canManage}
                          onChange={(priority) => handlers.onPriority(task, priority)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        );
      })}

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
