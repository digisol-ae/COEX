'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Notice, Select } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import { useToast } from '@/components/ui/toast';
import { moveTaskToSpaceAction } from './actions';

export interface MoveTarget {
  id: string;
  name: string;
  folders: { id: string; name: string }[];
}

/**
 * Moves a Personal task into a Space and, if wanted, one of its Folders. It lands in the Space's
 * first column, which the popup says, so nobody expects it to keep a column of its own.
 */
export function MoveToSpaceButton({ taskId, targets }: { taskId: string; targets: MoveTarget[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [spaceId, setSpaceId] = useState('');
  const [folderId, setFolderId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const folders = targets.find((target) => target.id === spaceId)?.folders ?? [];

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await moveTaskToSpaceAction(taskId, spaceId, folderId || null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      showToast('Task moved to the Space.');
      router.refresh();
    });
  }

  return (
    <>
      <IconButton icon="open" label="Move to a Space" onClick={() => setOpen(true)} />

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="popup-backdrop absolute inset-0"
          />

          <div className="popup-glass relative w-full max-w-sm space-y-3 p-4">
            <h2 className="font-medium text-[var(--color-ink)]">Move to a Space</h2>

            <Field label="Space">
              <Select
                value={spaceId}
                onChange={(event) => {
                  setSpaceId(event.currentTarget.value);
                  setFolderId('');
                }}
              >
                <option value="">Choose a Space</option>
                {targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.name}
                  </option>
                ))}
              </Select>
            </Field>

            {folders.length > 0 ? (
              <Field label="Folder" hint="Optional">
                <Select
                  value={folderId}
                  onChange={(event) => setFolderId(event.currentTarget.value)}
                >
                  <option value="">No folder</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            <p className="text-xs text-[var(--color-ink-subtle)]">
              The task goes into the first column of the Space, whatever it is called.
            </p>

            {error ? <Notice tone="alert">{error}</Notice> : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={pending || !spaceId} onClick={save}>
                {pending ? 'Moving' : 'Move'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
