'use client';

import { Button } from '@/components/ui';
import { startTimerAction, stopTimerAction } from '@/app/(app)/time/actions';

/**
 * Start and stop on the task itself, because a timer that lives somewhere else is a timer nobody
 * starts. Starting one while another runs stops the first, which is what the person means.
 */
export function TimerButton({ taskId, running }: { taskId: string; running: boolean }) {
  if (running) {
    return (
      <form action={stopTimerAction}>
        <Button type="submit" variant="danger">
          Stop timer
        </Button>
      </form>
    );
  }

  return (
    <form action={startTimerAction}>
      <input type="hidden" name="taskId" value={taskId} />
      <Button type="submit" variant="secondary">
        Start timer
      </Button>
    </form>
  );
}
