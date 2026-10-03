import { expect, it } from 'vitest';
import { ticketAnalytics, ticketCategory } from '@/modules/tickets/analytics';

it('counts open tickets, excludes completed tickets, and gives missed precedence over delayed', () => {
  const tickets = [
    { isOpen: true, firstResponseState: 'due', resolutionState: 'due' },
    { isOpen: true, firstResponseState: 'met', resolutionState: 'due_soon' },
    { isOpen: true, firstResponseState: 'breached', resolutionState: 'due_soon' },
    { isOpen: false, firstResponseState: 'breached', resolutionState: 'breached' },
  ] as const;
  expect(ticketAnalytics([...tickets])).toEqual({ opened: 3, delayed: 1, missed: 1 });
  expect(ticketCategory(tickets[2])).toBe('missed');
  expect(ticketCategory(tickets[3])).toBeNull();
});
it('handles an empty list', () => {
  expect(ticketAnalytics([])).toEqual({ opened: 0, delayed: 0, missed: 0 });
});
