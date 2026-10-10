'use client';

import { useState, useTransition } from 'react';
import { Button, Field, Input, Notice, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { AssigneePicker } from '@/components/tasks/inline-edit';
import { createTaskAnywhereAction } from './actions';

/**
 * Add task on All tasks (John, 9 Oct 2026): a popup where the task can go to Personal or to any
 * Space, with a folder, people, priority and dates. It submits by hand rather than through a form
 * action, because React clears a form after an action and a failed save (a private Space refusing
 * an assignee, say) must not lose what was typed.
 */
export function NewTaskPopup({
  spaces,
  folders,
  users,
}: {
  spaces: { id: string; name: string }[];
  folders: { id: string; spaceId: string; name: string }[];
  users: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [spaceId, setSpaceId] = useState('personal');
  const [folderId, setFolderId] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [priority, setPriority] = useState('normal');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  const personal = spaceId === 'personal';
  const spaceFolders = folders.filter((folder) => folder.spaceId === spaceId);

  function reset() {
    setTitle('');
    setDescription('');
    setSpaceId('personal');
    setFolderId('');
    setAssigneeIds([]);
    setPriority('normal');
    setStartAt('');
    setEndAt('');
    setError(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const data = new FormData();
    data.set('title', title);
    data.set('description', description);
    data.set('spaceId', spaceId);
    data.set('folderId', folderId);
    data.set('priority', priority);
    data.set('startAt', startAt);
    data.set('endAt', endAt);
    for (const id of assigneeIds) data.append('assigneeIds', id);

    startTransition(async () => {
      const result = await createTaskAnywhereAction({}, data);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      reset();
      showToast(personal ? 'Task created in Personal.' : 'Task created.');
    });
  }

  if (!open) return <Button onClick={() => setOpen(true)}>Add task</Button>;

  return (
    <div
      className="popup-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="New task"
    >
      <form
        onSubmit={submit}
        className="max-h-[90dvh] w-full max-w-xl overflow-y-auto popup-glass p-5 text-left"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">New task</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
          >
            ✕
          </button>
        </div>

        <Field label="Task">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            autoFocus
            placeholder="What needs to be done?"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Where">
            <Select
              value={spaceId}
              onChange={(event) => {
                setSpaceId(event.target.value);
                setFolderId('');
              }}
            >
              <option value="personal">Personal (only me)</option>
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </Select>
          </Field>

          {!personal && spaceFolders.length > 0 ? (
            <Field label="Folder">
              <Select value={folderId} onChange={(event) => setFolderId(event.target.value)}>
                <option value="">No folder</option>
                {spaceFolders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          {!personal ? (
            <Field label="Assignees">
              <AssigneePicker users={users} selectedIds={assigneeIds} onChange={setAssigneeIds} />
            </Field>
          ) : null}

          <Field label="Priority">
            <Select value={priority} onChange={(event) => setPriority(event.target.value)}>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </Select>
          </Field>

          <Field label="Start">
            <Input
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
            />
          </Field>
          <Field label="Due">
            <Input
              type="datetime-local"
              value={endAt}
              onChange={(event) => setEndAt(event.target.value)}
            />
          </Field>
        </div>

        <Field label="Description (optional)">
          <Textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>

        {error ? <Notice tone="alert">{error}</Notice> : null}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating' : 'Create task'}
          </Button>
        </div>
      </form>
    </div>
  );
}
