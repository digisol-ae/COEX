'use client';
import { UI_LABELS } from '@/components/ui/labels';

import { useActionState, useState } from 'react';
import { Button, Field, Input, Notice, Select } from '@/components/ui';
import { archiveTaskAction, updateTaskAction, type TaskFormState } from '../actions';

const initialState: TaskFormState = {};

interface TaskFields {
  id: string;
  title: string;
  description: string;
  priority: string;
  assigneeIds: string[];
  startAt: string;
  endAt: string;
  estimateHours: string;
  tags: string;
  folderId: string;
}

export function TaskForm({
  task,
  users,
  folders,
  canManage,
}: {
  canManage: boolean;
  folders: { id: string; name: string; isPrivate: boolean }[];
  users: { id: string; name: string }[];
  task: TaskFields;
}) {
  const [state, formAction, pending] = useActionState(updateTaskAction, initialState);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [assigneeIds, setAssigneeIds] = useState(task.assigneeIds);
  const [priority, setPriority] = useState(task.priority);
  const [startAt, setStartAt] = useState(task.startAt);
  const [endAt, setEndAt] = useState(task.endAt);
  const [estimateHours, setEstimateHours] = useState(task.estimateHours);
  const [folderId, setFolderId] = useState(task.folderId);
  const [tags, setTags] = useState(task.tags);

  /**
   * A form action that succeeds resets every uncontrolled field on it back to whatever defaultValue
   * it had before the submit, which is the value from before the save, not after. Folder is what
   * gave this away (empty flips visibly to something and back), but every field on this form ran
   * the same risk. Holding each field's value in state, refreshed only when the server actually
   * hands back new data, sidesteps that reset entirely: a controlled field is never touched by it.
   */
  const [previousTask, setPreviousTask] = useState(task);
  if (previousTask !== task) {
    setPreviousTask(task);
    setTitle(task.title);
    setDescription(task.description);
    setAssigneeIds(task.assigneeIds);
    setPriority(task.priority);
    setStartAt(task.startAt);
    setEndAt(task.endAt);
    setEstimateHours(task.estimateHours);
    setFolderId(task.folderId);
    setTags(task.tags);
  }

  if (!canManage) {
    return (
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs tracking-wide text-[var(--color-ink-subtle)] uppercase">Ends</dt>
          <dd className="text-[var(--color-ink)]">{task.endAt || 'No date'}</dd>
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
          <Input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </Field>

        <Field label="Description">
          <textarea
            name="description"
            rows={2}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="h-14 w-full resize-none rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] transition-[height] duration-150 outline-none hover:h-36 focus:h-36"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={UI_LABELS.assignedTo}>
            <select
              name="assigneeIds"
              multiple
              value={assigneeIds}
              onChange={(event) =>
                setAssigneeIds(Array.from(event.target.selectedOptions, (option) => option.value))
              }
              size={Math.min(users.length, 4)}
              title="Hold command to choose more than one"
              className="w-full rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="space-y-3">
            <Field label="Priority">
              <Select
                name="priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </Select>
            </Field>

            {folders.length > 0 ? (
              <Field label="Folder">
                <Select
                  name="folderId"
                  value={folderId}
                  onChange={(event) => setFolderId(event.target.value)}
                >
                  <option value="">No folder</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.isPrivate ? `${folder.name} (private)` : folder.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
          </div>

          <div className="space-y-3">
            <Field label="Starts">
              <Input
                name="startAt"
                type="datetime-local"
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
              />
            </Field>

            <Field label="Ends (the deadline)">
              <Input
                name="endAt"
                type="datetime-local"
                value={endAt}
                onChange={(event) => setEndAt(event.target.value)}
              />
            </Field>
          </div>

          <div className="space-y-3">
            <Field label="Estimate (hours)">
              <Input
                name="estimateHours"
                type="number"
                step="0.5"
                min="0"
                value={estimateHours}
                onChange={(event) => setEstimateHours(event.target.value)}
                title="Hours of effort, which is a different question from when it happens."
              />
            </Field>

            <Field label="Tags">
              <Input
                name="tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="Separated by commas"
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? UI_LABELS.saving : UI_LABELS.save}
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
