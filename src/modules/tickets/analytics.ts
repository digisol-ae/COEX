import type { TicketSummary } from './services/ticket.service';

type AnalyticsTicket = Pick<TicketSummary, 'isOpen' | 'firstResponseState' | 'resolutionState'>;
export function ticketCategory(ticket: AnalyticsTicket): 'delayed' | 'missed' | null {
  if (!ticket.isOpen) return null;
  if (ticket.firstResponseState === 'breached' || ticket.resolutionState === 'breached')
    return 'missed';
  if (ticket.firstResponseState === 'due_soon' || ticket.resolutionState === 'due_soon')
    return 'delayed';
  return null;
}
export function ticketAnalytics(tickets: AnalyticsTicket[]) {
  const counts = { opened: 0, delayed: 0, missed: 0 };
  for (const ticket of tickets) {
    if (!ticket.isOpen) continue;
    counts.opened++;
    const category = ticketCategory(ticket);
    if (category) counts[category]++;
  }
  return counts;
}
