'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardSection, Notice } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import { restoreSpaceAction } from '../tasks/actions';

/** Archived spaces, each restorable with everything that was archived with it. */
export function ArchivedSpaces({
  spaces,
  canManage,
  justArchived,
}: {
  spaces: { id: string; name: string; archivedAt: string; taskCount: number }[];
  canManage: boolean;
  justArchived: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(justArchived);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (spaces.length === 0) return null;

  function restore(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await restoreSpaceAction(id);
      if (result.error) setError(result.error);
      else router.push(`/spaces/${id}`);
    });
  }

  return (
    <Card className="mt-4">
      <CardSection>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-center justify-between text-left text-sm font-medium text-[var(--color-ink)]"
        >
          Archived spaces ({spaces.length})
          <span className="text-xs text-[var(--color-ink-subtle)]">{open ? 'Hide' : 'Show'}</span>
        </button>

        {open ? (
          <ul className="mt-3 divide-y divide-[var(--color-line)]">
            {spaces.map((space) => (
              <li key={space.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-[var(--color-ink)]">{space.name}</span>
                  <span className="text-xs text-[var(--color-ink-subtle)]">
                    Archived {new Date(space.archivedAt).toLocaleDateString('en-GB')} with{' '}
                    {space.taskCount} task{space.taskCount === 1 ? '' : 's'}
                  </span>
                </span>
                {canManage ? (
                  <IconButton
                    icon="restore"
                    label="Restore this space with its folders and tasks"
                    disabled={pending}
                    onClick={() => restore(space.id)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {error ? (
          <div className="mt-2">
            <Notice tone="alert">{error}</Notice>
          </div>
        ) : null}
      </CardSection>
    </Card>
  );
}
