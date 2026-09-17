'use client';

import { Button, Card, CardSection, EmptyState, Input } from '@/components/ui';
import { addSubtaskAction, toggleSubtaskAction } from '../actions';

/** One level of breakdown. A subtask that needs subtasks of its own is really a task. */
export function SubtaskList({
  taskId,
  subtasks,
  canManage,
}: {
  taskId: string;
  subtasks: { id: string; title: string; done: boolean }[];
  canManage: boolean;
}) {
  const done = subtasks.filter((subtask) => subtask.done).length;

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
              <li key={subtask.id}>
                <form action={toggleSubtaskAction} className="flex items-center gap-2">
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
