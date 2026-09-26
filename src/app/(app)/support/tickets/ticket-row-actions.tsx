'use client';
import { useState, useTransition } from 'react';
import { Select } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { STATUS_LABELS } from '@/modules/tickets/labels';
import type { Priority, TicketStatus } from '@/modules/tickets/services/ticket.service';
import { assignAction, setPriorityAction, setStatusAction } from '../actions';

// A minimum width, not max-w-full: the table would otherwise squeeze these columns, and on macOS
// the native dropdown arrow takes its own space, which cut "Normal" down to "Norm".
function statusTextClass(status: TicketStatus) {
  const tone = {
    new: 'text-[var(--color-status-info)]',
    open: 'text-[var(--color-status-info)]',
    pending_customer: 'text-[var(--color-status-warn)]',
    escalated: 'text-[var(--color-status-alert)]',
    resolved: 'text-[var(--color-status-ok)]',
    closed: 'text-[var(--color-status-ok)]',
  }[status];
  return `h-7 w-48 min-w-44 border-0 bg-transparent py-0 pr-6 pl-0 text-xs font-semibold ${tone} focus:ring-0`;
}

export function TicketRowActions({ ticket }: { ticket: { id: string; status: TicketStatus } }) {
  const [pending, startTransition] = useTransition();
  const run = (work: () => Promise<unknown>) => startTransition(() => { void work(); });
  return <Select aria-label="Change status" className={statusTextClass(ticket.status)} value={ticket.status} disabled={pending} onChange={(e) => run(() => setStatusAction({ id: ticket.id, status: e.target.value as TicketStatus }))}>{Object.entries(STATUS_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</Select>;
}

export function PriorityControl({ ticketId, priority }: { ticketId: string; priority: Priority }) { const [pending, startTransition] = useTransition(); const tone = { urgent: 'text-[var(--color-status-alert)]', high: 'text-[var(--color-status-warn)]', normal: 'text-[var(--color-ink-muted)]', low: 'text-[var(--color-status-ok)]' }[priority]; return <Select aria-label="Change priority" className={`h-7 w-28 min-w-24 border-0 bg-transparent py-0 pr-6 pl-0 text-xs font-semibold ${tone} focus:ring-0`} value={priority} disabled={pending} onChange={(e) => startTransition(() => { void setPriorityAction({ id: ticketId, priority: e.target.value as Priority }); })}>{['urgent','high','normal','low'].map((value) => <option key={value} value={value}>{value[0].toUpperCase()+value.slice(1)}</option>)}</Select>; }

export function AgentControl({ ticketId, assigneeId, assigneeName, users }: { ticketId: string; assigneeId: string | null; assigneeName: string | null; users: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false); const [next, setNext] = useState(assigneeId ?? ''); const [note, setNote] = useState(''); const [error, setError] = useState(''); const [pending, startTransition] = useTransition();
  const save = () => { if (assigneeId && next !== assigneeId && !note.trim()) { setError('Add a handover comment.'); return; } startTransition(async () => { const result = await assignAction({ id: ticketId, userId: next || null, note }); if (result.error) setError(result.error); else setOpen(false); }); };
  return <><button type="button" onClick={() => setOpen(true)} title={assigneeName ?? 'Assign agent'} aria-label={assigneeName ? `Change agent: ${assigneeName}` : 'Assign agent'} className="flex h-7 w-7 items-center justify-center rounded-full hover:ring-2 hover:ring-[var(--color-line-strong)]">{assigneeName ? <Avatar name={assigneeName} size="small" /> : <span className="text-[var(--color-ink-subtle)]">+</span>}</button>{open ? <div className="fixed inset-0 z-50 flex items-center justify-center p-4 popup-backdrop"><div className="popup-glass w-full max-w-sm p-4"><h2 className="font-medium">Assign agent</h2><Select className="mt-3 w-full" value={next} onChange={(e) => setNext(e.target.value)}><option value="">Unassigned</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</Select>{assigneeId && next !== assigneeId ? <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why is this ticket being reassigned?" className="mt-3 w-full rounded-[var(--radius-control)] border border-[var(--color-line)] p-2 text-sm" rows={3} /> : null}{error ? <p className="mt-2 text-xs text-[var(--color-status-alert)]">{error}</p> : null}<div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)}>Cancel</button><button type="button" disabled={pending} onClick={save} className="rounded-[var(--radius-control)] bg-[var(--color-ink)] px-3 py-1.5 text-sm text-white">Save</button></div></div></div> : null}</>;
}
