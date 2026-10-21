'use client';
import { UI_LABELS } from '@/components/ui/labels';

import { useRef } from 'react';
import { IconButton } from '@/components/ui/icon-button';
import { formatDateTime } from '@coex/shared/tasks/dates';

export function TicketHistory({
  messages,
}: {
  messages: { id: string; body: string; sentAt: Date; authorName: string }[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <IconButton
        icon="history"
        label="Ticket history"
        onClick={() => dialog.current?.showModal()}
      />
      <dialog
        ref={dialog}
        aria-labelledby="ticket-history-title"
        className="popup-glass m-auto max-h-[80vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto p-4 text-[var(--color-ink)] backdrop:bg-[var(--color-popup-backdrop)]"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="ticket-history-title" className="font-semibold">
            Ticket history
          </h2>
          <IconButton
            icon="close"
            label={UI_LABELS.close}
            onClick={() => dialog.current?.close()}
          />
        </div>
        {messages.length ? (
          <ol className="divide-y divide-[var(--color-line)]">
            {messages.map((message) => (
              <li key={message.id} className="py-3 text-sm">
                <p>{message.body}</p>
                <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                  By {message.authorName} · {formatDateTime(message.sentAt)}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-[var(--color-ink-muted)]">No history yet.</p>
        )}
      </dialog>
    </>
  );
}
