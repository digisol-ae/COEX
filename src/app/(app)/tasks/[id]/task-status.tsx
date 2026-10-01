'use client';

import { useState, useTransition } from 'react';
import { clsx } from 'clsx';
import { useToast } from '@/components/ui/toast';
import { setTaskStatusAction } from '../actions';

/**
 * The task's one status, changeable from the full task page as on the board (John, 1 Oct 2026).
 * The choices are the space's own workflow; completion follows the stage, never the name.
 */
export function TaskStatus({
  taskId,
  spaceId,
  status,
  statuses,
}: {
  taskId: string;
  spaceId: string;
  status: string;
  statuses: { name: string; isClosed: boolean }[];
}) {
  const { showToast } = useToast();
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();

  // A save elsewhere (the board, another tab) hands back a new status; follow it.
  const [previousStatus, setPreviousStatus] = useState(status);
  if (previousStatus !== status) {
    setPreviousStatus(status);
    setValue(status);
  }

  const closed = statuses.find((stage) => stage.name === value)?.isClosed ?? false;
  // A status no longer in the workflow stays visible rather than silently showing another one.
  const choices = statuses.some((stage) => stage.name === value)
    ? statuses
    : [{ name: value, isClosed: false }, ...statuses];

  function change(next: string) {
    const before = value;
    setValue(next);
    startTransition(async () => {
      const result = await setTaskStatusAction({ id: taskId, spaceId, status: next });
      if (result.error) {
        setValue(before);
        showToast(result.error, 'alert');
      } else {
        showToast(`Status changed to ${next}.`);
      }
    });
  }

  return (
    <select
      aria-label="Status"
      title="Change status"
      value={value}
      disabled={pending}
      onChange={(event) => change(event.target.value)}
      className={clsx(
        'h-8 cursor-pointer rounded-full border px-3 text-xs font-medium disabled:opacity-60',
        closed
          ? 'border-[var(--color-status-ok)] bg-[var(--color-status-ok-soft)] text-[var(--color-status-ok)]'
          : 'border-[var(--color-status-info)] bg-[var(--color-status-info-soft)] text-[var(--color-status-info)]',
      )}
    >
      {choices.map((stage) => (
        <option key={stage.name} value={stage.name}>
          {stage.name}
        </option>
      ))}
    </select>
  );
}
