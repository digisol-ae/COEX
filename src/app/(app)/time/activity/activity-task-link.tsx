'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { TaskPreview } from '@/components/tasks/task-preview';
import type { TaskSummary } from '@/modules/tasks/services/task.service';

/** A task title that opens the same quick preview popup as Tasks; a modified click still navigates. */
export function ActivityTaskLink({ task, children }: { task: TaskSummary; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Link
        href={`/tasks/${task.id}`}
        className="font-medium underline-offset-4 hover:underline"
        onClick={(event) => {
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0
          )
            return;
          event.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </Link>
      {open ? <TaskPreview task={task} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
