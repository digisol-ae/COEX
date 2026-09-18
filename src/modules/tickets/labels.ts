import type { SlaState, TicketStatus } from './services/ticket.service';

/**
 * The words the desk uses.
 *
 * Stored values are machine readable and stay that way; every screen reads from here instead of
 * printing pending_customer at a person or inventing its own wording in each component.
 */

export const STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'New',
  open: 'Open',
  pending_customer: 'Waiting on customer',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const CHANNEL_LABELS: Record<string, string> = {
  agent: 'Raised by us',
  portal: 'Portal',
  email: 'Email',
  whatsapp: 'WhatsApp',
  system: 'System',
};

/**
 * How a message arrived, in words that match who it came from.
 *
 * A message typed in by an agent on the customer's behalf is on the agent channel but came from
 * the customer, and labelling it "Raised by us" beside "From the customer" reads as a
 * contradiction. It was taken down by us, and that is what it should say.
 */
export function channelLabel(channel: string, direction: 'inbound' | 'outbound'): string {
  if (channel === 'agent') return direction === 'inbound' ? 'Taken down by us' : 'Raised by us';

  return CHANNEL_LABELS[channel] ?? channel;
}

export const SLA_LABELS: Record<SlaState, string> = {
  none: 'No target',
  met: 'Met',
  due: 'Running',
  due_soon: 'Due soon',
  breached: 'Missed',
};

/** How long until a due time, or how long since it passed, in the words a person would use. */
export function untilDue(dueAt: Date | string | null | undefined, now = new Date()): string {
  if (!dueAt) return '';

  const date = typeof dueAt === 'string' ? new Date(dueAt) : dueAt;
  const minutes = Math.round((date.getTime() - now.getTime()) / 60000);
  const magnitude = Math.abs(minutes);

  const size =
    magnitude < 60
      ? `${magnitude}m`
      : magnitude < 60 * 24
        ? `${Math.round(magnitude / 60)}h`
        : `${Math.round(magnitude / (60 * 24))}d`;

  return minutes >= 0 ? `in ${size}` : `${size} ago`;
}
