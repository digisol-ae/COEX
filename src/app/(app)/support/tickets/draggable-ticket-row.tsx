'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactNode } from 'react';
import { saveTicketOrderAction, resetTicketOrderAction } from '../actions';

/**
 * One row of the ticket table that can be dragged to a new place (John, 9 Oct 2026).
 *
 * The order is the signed-in person's own. Dropping works out the new order from the rows that are
 * on screen, so a filtered view saves only what it shows. The shared table turns `draggable` off
 * while a column sort is active, so sorting and dragging never fight. The row's `sortValues` are
 * handed through for the same table.
 */
export function DraggableTicketRow({
  ticketId,
  draggable = true,
  className,
  children,
}: {
  ticketId: string;
  draggable?: boolean;
  sortValues?: (string | number | null)[];
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [over, setOver] = useState(false);

  return (
    <tr
      data-ticket-id={ticketId}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', ticketId);
        event.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(event) => {
        if (!draggable) return;
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        setOver(false);
        const draggedId = event.dataTransfer.getData('text/plain');
        if (!draggable || !draggedId || draggedId === ticketId) return;
        event.preventDefault();

        const rows = Array.from(
          event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('tr[data-ticket-id]') ??
            [],
        );
        const ids = rows.map((row) => row.dataset.ticketId ?? '').filter(Boolean);
        const without = ids.filter((id) => id !== draggedId);
        without.splice(without.indexOf(ticketId), 0, draggedId);

        startTransition(async () => {
          await saveTicketOrderAction(without);
          router.refresh();
        });
      }}
      className={`${className ?? ''} ${draggable ? 'cursor-grab' : ''} ${over ? 'outline-2 -outline-offset-2 outline-[var(--color-brand-red)]' : ''}`}
    >
      {children}
    </tr>
  );
}

/** Puts the list back to its normal order (latest activity first) for the signed-in person. */
export function ResetTicketOrderButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await resetTicketOrderAction();
          router.refresh();
        })
      }
      className="text-xs text-[var(--color-ink-muted)] underline disabled:opacity-60"
    >
      Reset my order
    </button>
  );
}
