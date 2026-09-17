'use client';

import { useActionState } from 'react';
import { Button, Field, Input, Notice, Select } from '@/components/ui';
import { archiveTaskAction, updateTaskAction, type TaskFormState } from '../actions';

const initialState: TaskFormState = {};

export function TaskForm({
  task,
  users,
  phases,
  canManage,
}: {
  canManage: boolean;
  phases: string[];
  users: { id: string; name: string }[];
  task: {
    id: string;
    title: string;
    description: string;
    priority: string;
    assigneeIds: string[];
    dueDate: string;
    startDate: string;
    estimateHours: string;
    tags: string;
    phase: string;
  };
}) {
  const [state, formAction, pending] = useActionState(updateTaskAction, initialState);

  if (!canManage) {
    return (
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs tracking-wide text-[var(--color-ink-subtle)] uppercase">Due</dt>
          <dd className="text-[var(--color-ink)]">{task.dueDate || 'No date'}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-wide text-[var(--color-ink-subtle)] uppercase">
            Description
          </dt>
          <dd className="whitespace-pre-wrap text-[var(--color-ink-muted)]">
            {task.description || '—'}
          </dd>
        </div>
      </dl>
    );
  }

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="id" value={task.id} />

        <Field label="Title">
          <Input name="title" defaultValue={task.title} required />
        </Field>

        <Field label="Description">
          <textarea
            name="description"
            rows={4}
            defaultValue={task.description}
            className="w-full rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
          />
        </Field>

        <Field label="Assigned to" hint="Hold command to choose more than one">
          <select
            name="assigneeIds"
            multiple
            defaultValue={task.assigneeIds}
            size={Math.min(users.length, 5)}
            className="w-full rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Priority">
          <Select name="priority" defaultValue={task.priority}>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start">
            <Input name="startDate" type="date" defaultValue={task.startDate} />
          </Field>

          <Field label="Due">
            <Input name="dueDate" type="date" defaultValue={task.dueDate} />
          </Field>
        </div>

        <Field label="Estimate" hint="Hours. Compared against logged time in milestone four.">
          <Input
            name="estimateHours"
            type="number"
            step="0.5"
            min="0"
            defaultValue={task.estimateHours}
          />
        </Field>

        {phases.length > 0 ? (
          <Field label="Phase" hint="Grouping inside the project, not a separate list">
            <Select name="phase" defaultValue={task.phase}>
              <option value="">No phase</option>
              {phases.map((phase) => (
                <option key={phase} value={phase}>
                  {phase}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field label="Tags" hint="Separated by commas">
          <Input name="tags" defaultValue={task.tags} />
        </Field>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving' : 'Save'}
          </Button>
          {state.saved ? <Notice tone="ok">Saved.</Notice> : null}
          {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
        </div>
      </form>

      <form action={archiveTaskAction} className="border-t border-[var(--color-line)] pt-4">
        <input type="hidden" name="id" value={task.id} />
        <Button variant="danger" type="submit">
          Archive task
        </Button>
      </form>
    </div>
  );
}
