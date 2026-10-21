'use client';

import { DetailPopup } from '@/components/ui/detail-popup';
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
        <DetailPopup title="Created and assigned">
          <TaskOriginLines
            origin={origin}
            viewerId={viewerId}
            people={people}
            className="space-y-1.5 text-sm text-[var(--color-ink-muted)]"
          />
        </DetailPopup>
      </div>
    </>
  );
}
