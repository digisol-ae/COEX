'use client';
import { UI_LABELS } from '@/components/ui/labels';

import { clsx } from 'clsx';
import { Button } from '@/components/ui';
import { startTimerAction, stopTimerAction } from '@/app/(app)/time/actions';

/**
 * Start and stop on the task itself, because a timer that lives somewhere else is a timer nobody
 * starts. Starting one while another runs stops the first, which is what the person means.
 */
export function TimerButton({
  taskId,
  running,
  compact = false,
}: {
  taskId: string;
  running: boolean;
  compact?: boolean;
}) {
  if (running) {
    return (
      <form action={stopTimerAction}>
        <Button type="submit" variant="danger" className={clsx(compact && '!px-2 !py-1 !text-xs')}>
          {UI_LABELS.stopTimer}
        </Button>
      </form>
    );
  }

  return (
    <form action={startTimerAction}>
      <input type="hidden" name="taskId" value={taskId} />
      <Button type="submit" variant="secondary" className={clsx(compact && '!px-2 !py-1 !text-xs')}>
        {UI_LABELS.startTimer}
      </Button>
    </form>
  );
}
