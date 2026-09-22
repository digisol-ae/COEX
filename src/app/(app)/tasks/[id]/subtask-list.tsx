'use client';

import { useTransition } from 'react';
import { Button, Card, CardSection, EmptyState, Input } from '@/components/ui';
import { addSubtaskAction, setSubtaskAssigneeAction, toggleSubtaskAction } from '../actions';

/** One level of breakdown. A subtask that needs subtasks of its own is really a task. */
export function SubtaskList({
  taskId,
  subtasks,
  users,
  canManage,
}: {
  taskId: string;
  subtasks: { id: string; title: string; done: boolean; assigneeId: string | null }[];
  users: { id: string; name: string }[];
  canManage: boolean;
}) {
  const done = subtasks.filter((subtask) => subtask.done).length;
  const [, startTransition] = useTransition();

  return (
    <Card>
      <CardSection
        title={subtasks.length ? `Subtasks · ${done} of ${subtasks.length}` : 'Subtasks'}
      >
        {subtasks.length === 0 ? (
          <EmptyState message="No subtasks. Add them if the task is worth breaking down." />
        ) : (
          <ul className="space-y-2">
            {subtasks.map((subtask) => (
              <li key={subtask.id} className="flex items-center gap-2">
                <form action={toggleSubtaskAction} className="flex flex-1 items-center gap-2">
                  <input type="hidden" name="taskId" value={taskId} />
                  <input type="hidden" name="subtaskId" value={subtask.id} />
                  <input type="hidden" name="done" value={String(subtask.done)} />
                  <input
                    type="checkbox"
                    checked={subtask.done}
                    disabled={!canManage}
                    onChange={(event) => event.currentTarget.form?.requestSubmit()}
                  />
                  <span
                    className={
                      subtask.done
                        ? 'text-sm text-[var(--color-ink-subtle)] line-through'
                        : 'text-sm text-[var(--color-ink)]'
                    }
                  >
                    {subtask.title}
                  </span>
                </form>

                {canManage ? (
                  <select
                    aria-label={`Assign ${subtask.title}`}
                    value={subtask.assigneeId ?? ''}
                    onChange={(event) => {
                      const assigneeId = event.target.value || null;
                      startTransition(async () => {
                        await setSubtaskAssigneeAction({ taskId, subtaskId: subtask.id, assigneeId });
                      });
                    }}
                    className="max-w-40 truncate rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-ink-muted)]"
                  >
                    <option value="">Unassigned</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                ) : subtask.assigneeId ? (
                  <span className="text-xs text-[var(--color-ink-subtle)]">
                    {users.find((user) => user.id === subtask.assigneeId)?.name ?? ''}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canManage ? (
          <form action={addSubtaskAction} className="mt-4 flex gap-2">
            <input type="hidden" name="taskId" value={taskId} />
            <Input name="title" placeholder="Add a subtask" className="flex-1" />
            <Button type="submit" variant="secondary">
              Add
            </Button>
          </form>
        ) : null}
      </CardSection>
    </Card>
  );
}
