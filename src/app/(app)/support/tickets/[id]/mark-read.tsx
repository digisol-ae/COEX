'use client';

import { useEffect } from 'react';
import { markTicketReadAction } from '../../actions';

/**
 * Clears the unread mark while the ticket is on screen. It fires again when a refresh brings in a
 * new customer message, because having the ticket open is having seen it.
 */
export function MarkTicketRead({ ticketId, unread }: { ticketId: string; unread: boolean }) {
  useEffect(() => {
    if (unread) void markTicketReadAction(ticketId);
  }, [ticketId, unread]);

  return null;
}
