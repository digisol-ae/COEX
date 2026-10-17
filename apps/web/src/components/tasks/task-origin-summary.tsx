'use client';

import { useState } from 'react';
import { IconButton } from '@/components/ui/icon-button';
import { formatDateTime } from '@coex/shared/tasks/dates';
import type { TaskOrigin } from '@/modules/tasks/services/task.service';
import { TaskOriginLines } from './task-origin';

/**
 * Who created a task and who put people on it, kept to one quiet line with the full history one
 * click away in a popup (John's team, 18 Oct 2026: three lines of history above every task pushed
 * the work down). The line says who made it and when, and how many assignments there are.
 */
export function TaskOriginSummary({
  origin,
  viewerId,
  people,
}: {
  origin: TaskOrigin;
  viewerId: string;
  people: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const assignments = origin.assignedBy.length;

  if (!origin.createdBy && assignments === 0) return null;

  return (
    <>
      <div className="flex items-center gap-1 px-2 text-xs text-[var(--color-ink-muted)]">
        <span className="min-w-0 truncate">
          {origin.createdBy ? (
            <>
              Created by <b className="font-medium">{origin.createdBy.name}</b>,{' '}
              {formatDateTime(origin.createdBy.at)}
            </>
          ) : (
            'Assignment history'
          )}
          {assignments > 0 ? ` · ${assignments} assignment${assignments === 1 ? '' : 's'}` : ''}
        </span>
        <IconButton
          icon="history"
          label="Show who created and assigned this"
          onClick={() => setOpen(true)}
        />
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="popup-backdrop absolute inset-0"
          />

          <div className="popup-glass relative w-full max-w-sm space-y-3 p-4">
            <h2 className="font-medium text-[var(--color-ink)]">Created and assigned</h2>
            <TaskOriginLines
              origin={origin}
              viewerId={viewerId}
              people={people}
              className="space-y-1.5 text-sm text-[var(--color-ink-muted)]"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
