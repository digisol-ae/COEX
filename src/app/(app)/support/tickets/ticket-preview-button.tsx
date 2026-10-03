'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Icon, IconButton, IconLink, type IconName } from '@/components/ui/icon-button';
import type { TicketPreviewData } from '@/modules/tickets/preview';
import { formatMinutes } from '@/modules/time/week';
import { formatDateTime } from '@/modules/tasks/dates';

export function TicketPreviewButton({ ticketId }: { ticketId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton icon="preview" label="Preview ticket" onClick={() => setOpen(true)} />
      {open ? <TicketPreview ticketId={ticketId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function TicketPreview({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [detail, setDetail] = useState<TicketPreviewData | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    dialog.current?.showModal();
    fetch(`/api/tickets/${ticketId}/preview`, { signal: controller.signal, cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Could not load this ticket.');
        return response.json();
      })
      .then(setDetail)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      });
    return () => controller.abort();
  }, [ticketId]);
  return (
    <dialog
      ref={dialog}
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby={titleId}
      className="popup-glass m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto p-4 text-[var(--color-ink)] backdrop:bg-black/50"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-[var(--color-ink-subtle)]">
            {detail?.number ?? 'Ticket preview'}
          </p>
          <h2 id={titleId} className="mt-1 text-base leading-snug font-semibold break-words">
            {detail?.subject ?? 'Quick information'}
          </h2>
        </div>
        <div className="flex shrink-0 gap-1">
          <IconLink icon="open" label="Open full ticket" href={`/support/tickets/${ticketId}`} />
          <IconButton icon="close" label="Close preview" onClick={onClose} />
        </div>
      </header>
      {error ? (
        <p role="alert" className="mt-3 text-sm">
          {error}
        </p>
      ) : !detail ? (
        <p role="status" className="mt-3 text-sm">
          Loading ticket…
        </p>
      ) : (
        <>
          <dl className="my-3 flex flex-wrap gap-1.5 text-xs">
            {(
              [
                ['status', 'Status', detail.status],
                ['priority', 'Priority', detail.priority],
                ['queue', 'Queue', detail.queue],
                ['customer', 'Customer', detail.customer],
                ['contact', 'Contact', detail.contact],
                ['contact', 'Agent', detail.assignee ?? 'Unassigned'],
                ['clock', 'Logged time', formatMinutes(detail.loggedMinutes)],
                [
                  'attachment',
                  'Attachments',
                  detail.attachmentCount ? String(detail.attachmentCount) : null,
                ],
              ] satisfies [IconName, string, string | null][]
            )
              .filter(([, , value]) => value)
              .map(([icon, label, value]) => (
                <div
                  key={label}
                  title={`${label}: ${value}`}
                  className="flex max-w-full items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface-muted)] px-2 py-1"
                >
                  <dt>
                    <span className="sr-only">{label}</span>
                    <span
                      aria-hidden="true"
                      className="flex shrink-0 text-[var(--color-ink-subtle)]"
                    >
                      <Icon name={icon} size={14} />
                    </span>
                  </dt>
                  <dd
                    className={`truncate ${label === 'Priority' && (value === 'urgent' || value === 'high') ? 'font-medium text-[var(--color-status-alert)]' : ''}`}
                  >
                    {value}
                  </dd>
                </div>
              ))}
          </dl>
          <h3 className="sr-only">Brief</h3>
          <p className="line-clamp-4 text-[13px] leading-snug whitespace-pre-wrap break-words text-[var(--color-ink-muted)]">
            {detail.brief || 'No description.'}
          </p>
          {detail.latest && detail.latest.body !== detail.brief ? (
            <div className="mt-3 border-t border-[var(--color-line)] pt-2">
              <h3
                className="flex items-center gap-1.5 text-xs font-medium"
                title={detail.latest.internal ? 'Latest internal note' : 'Latest message'}
              >
                <span aria-hidden="true">
                  <Icon name={detail.latest.internal ? 'lock' : 'message'} size={14} />
                </span>
                <span className="sr-only">
                  Latest {detail.latest.internal ? 'internal note' : 'message'} by{' '}
                </span>
                {detail.latest.author}
              </h3>
              <p className="mt-1 line-clamp-3 text-xs leading-snug whitespace-pre-wrap break-words text-[var(--color-ink-muted)]">
                {detail.latest.body}
              </p>
            </div>
          ) : null}
          <p
            className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--color-ink-subtle)]"
            title="Last updated"
          >
            <span aria-hidden="true">
              <Icon name="history" size={12} />
            </span>
            <span className="sr-only">Updated </span>
            {formatDateTime(detail.lastActivityAt)}
          </p>
        </>
      )}
    </dialog>
  );
}
