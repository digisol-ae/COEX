'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardSection, Notice } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import type { ArchivedFolder } from '@/modules/tasks/services/folder-archive.service';
import { restoreFolderAction } from '../tasks/actions';

export function ArchivedFolders({ folders }: { folders: ArchivedFolder[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  if (!folders.length) return null;
  return (
    <Card className="mt-4">
      <CardSection>
        <button
          type="button"
          className="w-full text-left text-sm font-medium"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          Archived folders ({folders.length})
        </button>
        {open && (
          <ul className="mt-3 divide-y divide-[var(--color-line)]">
            {folders.map((folder) => (
              <li key={folder.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <p>{folder.name}</p>
                  <p className="text-xs text-[var(--color-ink-subtle)]">
                    {folder.legacyArchive
                      ? 'Older archive: restores the folder only. Retained tasks remain archived for review.'
                      : `${folder.taskCount} retained tasks`}
                  </p>
                </div>
                <IconButton
                  icon="restore"
                  label={`Restore ${folder.name}`}
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      setError('');
                      const result = await restoreFolderAction(folder.id);
                      if (result.error) setError(result.error);
                      else router.refresh();
                    })
                  }
                />
              </li>
            ))}
          </ul>
        )}
        {error && <Notice tone="alert">{error}</Notice>}
      </CardSection>
    </Card>
  );
}
