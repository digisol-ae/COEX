'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Notice } from '@/components/ui';
import { archiveSpaceAction, spaceArchiveImpactAction } from '../../tasks/actions';

/**
 * Archiving a whole Space (John, 28 Sep 2026). Two steps, because it takes every task with it: the
 * first says exactly how much, the second does it. Nothing is deleted; Spaces, Archived brings it
 * all back.
 */
export function ArchiveSpace({ spaceId, spaceName }: { spaceId: string; spaceName: string }) {
  const router = useRouter();
  const [impact, setImpact] = useState<{ tasks: number; folders: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function check() {
    setError(null);
    startTransition(async () => {
      const result = await spaceArchiveImpactAction(spaceId);
      if (result.error) setError(result.error);
      else setImpact({ tasks: result.tasks ?? 0, folders: result.folders ?? 0 });
    });
  }

  function archive() {
    setError(null);
    startTransition(async () => {
      const result = await archiveSpaceAction(spaceId);
      if (result.error) setError(result.error);
      else router.push('/spaces?archived=1');
    });
  }

  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

  return (
    <div className="mt-5 border-t border-[var(--color-line)] pt-4">
      <h3 className="text-sm font-semibold text-[var(--color-ink)]">Archive this space</h3>
      {impact ? (
        <div className="mt-2 space-y-3">
          <p className="text-sm text-[var(--color-ink-muted)]">
            {spaceName}, its {plural(impact.folders, 'folder')} and {plural(impact.tasks, 'task')}{' '}
            with their subtasks will disappear from lists, boards, the menu and everyone&apos;s
            tasks. Logged time stays in timesheets. You can restore it all from Spaces, Archived.
          </p>
          {error ? <Notice tone="alert">{error}</Notice> : null}
          <div className="flex gap-2">
            <Button type="button" variant="danger" disabled={pending} onClick={archive}>
              {pending ? 'Archiving' : `Archive ${plural(impact.tasks, 'task')}`}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setImpact(null)}>
              Keep it
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[var(--color-ink-subtle)]">
            Hides the space with all its folders, tasks and subtasks. Nothing is deleted.
          </p>
          {error ? <Notice tone="alert">{error}</Notice> : null}
          <Button type="button" variant="secondary" disabled={pending} onClick={check}>
            Archive space…
          </Button>
        </div>
      )}
    </div>
  );
}
