'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { Button, Card, CardSection, EmptyState, Input, Notice } from '@/components/ui';
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
  const [visibleSubtasks, setOptimisticDone] = useOptimistic(
    subtasks,
    (current, change: { id: string; done: boolean }) =>
      current.map((subtask) =>
        subtask.id === change.id ? { ...subtask, done: change.done } : subtask,
      ),
  );
  const done = visibleSubtasks.filter((subtask) => subtask.done).length;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardSection
        title={subtasks.length ? `Subtasks · ${done} of ${subtasks.length}` : 'Subtasks'}
      >
        {error ? <Notice tone="warn">{error}</Notice> : null}
        {subtasks.length === 0 ? (
          <EmptyState message="No subtasks. Add them if the task is worth breaking down." />
        ) : (
          <ul className="space-y-2">
            {visibleSubtasks.map((subtask) => (
              <li key={subtask.id} className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="checkbox"
                    aria-label={`Complete ${subtask.title}`}
                    checked={subtask.done}
                    disabled={!canManage || pending}
                    onChange={(event) => {
                      const nextDone = event.currentTarget.checked;
                      startTransition(async () => {
                        setError(null);
                        setOptimisticDone({ id: subtask.id, done: nextDone });
                        const formData = new FormData();
                        formData.set('taskId', taskId);
                        formData.set('subtaskId', subtask.id);
                        // The legacy action accepts the previous state and toggles it.
                        formData.set('done', String(!nextDone));
                        try {
                          const result = await toggleSubtaskAction(formData);
                          if (result.error) setError(result.error);
                        } catch {
                          setError('Could not update this subtask. Please try again.');
                        }
                      });
                    }}
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
                </div>

                {canManage ? (
                  <select
                    aria-label={`Assign ${subtask.title}`}
                    value={subtask.assigneeId ?? ''}
                    onChange={(event) => {
                      const assigneeId = event.target.value || null;
                      startTransition(async () => {
                        setError(null);
                        try {
                          const result = await setSubtaskAssigneeAction({
                            taskId,
                            subtaskId: subtask.id,
                            assigneeId,
                          });
                          if (result.error) setError(result.error);
                        } catch {
                          setError('Could not assign this subtask. Please try again.');
                        }
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
          <form
            action={async (formData) => {
              setError(null);
              try {
                const result = await addSubtaskAction(formData);
                if (result.error) setError(result.error);
              } catch {
                setError('Could not add this subtask. Please try again.');
              }
            }}
            className="mt-4 flex gap-2"
          >
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
