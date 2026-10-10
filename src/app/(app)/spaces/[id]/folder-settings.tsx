'use client';

import { useActionState, useState, useTransition } from 'react';
import { Button, Field, Input, Notice } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { archiveFolderAction, saveFolderAction, type TaskFormState } from '../../tasks/actions';

const initialState: TaskFormState = {};

/**
 * The folder half of the same idea as Space settings: a gear icon beside the active folder opens
 * a small popup rather than a full page, and `saveFolderAction` already handled both rename and
 * membership before this existed. Only the trigger and the form were missing.
 */
export function FolderSettings({
  spaceId,
  folder,
  users,
  openTaskCount,
  onArchived,
}: {
  spaceId: string;
  folder: { id: string; name: string; description: string | null; memberIds: string[] };
  users: { id: string; name: string }[];
  openTaskCount: number;
  onArchived: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiving, startArchive] = useTransition();
  const { showToast } = useToast();
  const [state, action, pending] = useActionState(
    async (previous: TaskFormState, formData: FormData) => {
      const result = await saveFolderAction(previous, formData);
      if (result.saved) {
        setOpen(false);
        showToast('Folder saved.');
      }
      return result;
    },
    initialState,
  );

  function archive(withTasks: boolean) {
    const formData = new FormData();
    formData.set('id', folder.id);
    formData.set('spaceId', spaceId);
    formData.set('withTasks', withTasks ? 'yes' : 'no');

    startArchive(async () => {
      const result = await archiveFolderAction(formData);
      if (result.error) {
        setArchiveError(result.error);
        return;
      }
      setOpen(false);
      setConfirming(false);
      onArchived();
      showToast(withTasks ? 'Folder and its tasks archived.' : 'Folder archived.');
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Folder settings"
        aria-label="Folder settings"
        className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-ink-subtle)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="m19.4 15 .1-1.2 1.7-1.3-1.8-3.1-2 .8-1-.6-.3-2.1H12.5l-.3 2.1-1 .6-2-.8-1.8 3.1 1.7 1.3.1 1.2-1.7 1.3 1.8 3.1 2-.8 1 .6.3 2.1h3.6l.3-2.1 1-.6 2 .8 1.8-3.1-1.7-1.3Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    );
  }

  return (
    <div
      className="popup-backdrop fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Folder settings"
    >
      <form action={action} className="w-full max-w-lg popup-glass p-5 text-left">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--color-ink)]">Folder settings</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <input type="hidden" name="id" value={folder.id} />
        <input type="hidden" name="spaceId" value={spaceId} />

        <Field label="Folder name">
          <Input name="name" defaultValue={folder.name} required />
        </Field>

        <Field label="Description">
          <Input name="description" defaultValue={folder.description ?? ''} />
        </Field>

        <Field
          label="Private members"
          hint="Leave empty so everyone in the space can see this folder. Hold command to select several."
        >
          <select
            name="memberIds"
            multiple
            defaultValue={folder.memberIds}
            className="h-28 w-full rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1.5 text-sm"
          >
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </Field>

        {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving' : 'Save folder'}
          </Button>
        </div>

        <div className="mt-5 border-t border-[var(--color-line)] pt-4">
          {confirming ? (
            <div className="space-y-2" role="group" aria-label="Archive this folder">
              <p className="text-sm text-[var(--color-ink)]">
                Archive <strong>{folder.name}</strong>? Nothing is deleted for good. Logged time is
                kept.
              </p>
              {archiveError ? <Notice tone="alert">{archiveError}</Notice> : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={archiving}
                  onClick={() => archive(false)}
                >
                  Archive folder, keep its tasks in the space
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={archiving}
                  onClick={() => archive(true)}
                >
                  Archive folder and its tasks ({openTaskCount} open)
                </Button>
                <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
                  Not now
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="secondary" onClick={() => setConfirming(true)}>
              Archive or remove this folder…
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
