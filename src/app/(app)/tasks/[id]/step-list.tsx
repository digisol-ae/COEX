'use client';

import { Button, Card, CardSection, EmptyState, Input } from '@/components/ui';
import { addStepAction, toggleStepAction } from '../actions';

/** One level of breakdown. A step that needs steps of its own is really a task. */
export function StepList({
  taskId,
  steps,
  canManage,
}: {
  taskId: string;
  steps: { id: string; title: string; done: boolean }[];
  canManage: boolean;
}) {
  const done = steps.filter((step) => step.done).length;

  return (
    <Card>
      <CardSection title={steps.length ? `Steps · ${done} of ${steps.length}` : 'Steps'}>
        {steps.length === 0 ? (
          <EmptyState message="No steps. Add them if the task is worth breaking down." />
        ) : (
          <ul className="space-y-2">
            {steps.map((step) => (
              <li key={step.id}>
                <form action={toggleStepAction} className="flex items-center gap-2">
                  <input type="hidden" name="taskId" value={taskId} />
                  <input type="hidden" name="stepId" value={step.id} />
                  <input type="hidden" name="done" value={String(step.done)} />
                  <input
                    type="checkbox"
                    checked={step.done}
                    disabled={!canManage}
                    onChange={(event) => event.currentTarget.form?.requestSubmit()}
                  />
                  <span
                    className={
                      step.done
                        ? 'text-sm text-[var(--color-ink-subtle)] line-through'
                        : 'text-sm text-[var(--color-ink)]'
                    }
                  >
                    {step.title}
                  </span>
                </form>
              </li>
            ))}
          </ul>
        )}

        {canManage ? (
          <form action={addStepAction} className="mt-4 flex gap-2">
            <input type="hidden" name="taskId" value={taskId} />
            <Input name="title" placeholder="Add a step" className="flex-1" />
            <Button type="submit" variant="secondary">
              Add
            </Button>
          </form>
        ) : null}
      </CardSection>
    </Card>
  );
}
