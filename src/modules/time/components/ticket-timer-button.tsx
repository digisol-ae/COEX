'use client';

import { Button } from '@/components/ui';
import { startTicketTimerAction, stopTimerAction } from '@/app/(app)/time/actions';

/**
 * The ticket half of `TimerButton`: start and stop on the ticket itself. Starting one while
 * another timer runs, task or ticket, stops the first, which is what the person means.
 */
export function TicketTimerButton({ ticketId, running }: { ticketId: string; running: boolean }) {
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
    <form action={startTicketTimerAction}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <Button type="submit" variant="secondary">
        Start timer
      </Button>
    </form>
  );
}
