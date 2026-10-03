'use client';

import { useEffect, useState } from 'react';
import { elapsedClock } from '../elapsed-clock';
import { Button } from '@/components/ui';
import { startTicketTimerAction, stopTimerAction } from '@/app/(app)/time/actions';

/**
 * The ticket half of `TimerButton`: start and stop on the ticket itself. Starting one while
 * another timer runs, task or ticket, stops the first, which is what the person means.
 */
export function TicketTimerButton({
  ticketId,
  running,
  startedAt = null,
}: {
  ticketId: string;
  running: boolean;
  startedAt?: string | null;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [running, startedAt]);
  if (running) {
    return (
      <form action={stopTimerAction}>
        <Button type="submit" variant="danger">
          <span className="tabular-nums" aria-label="Elapsed time">
            {startedAt ? elapsedClock(startedAt, now ?? Date.parse(startedAt)) : '00:00:00'}
          </span>
          <span className="ml-2">■ Stop timer</span>
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
