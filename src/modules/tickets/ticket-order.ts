/**
 * A person's own order for the ticket list (John, 9 Oct 2026).
 *
 * The order is personal, so one agent dragging a ticket never rearranges a colleague's list. It is
 * a list of ticket ids: tickets named in it come first, in that order, and everything else follows
 * in the list's normal order (latest activity first). A ticket that is new or was never dragged
 * therefore still appears, and a deleted or archived id in the list is simply ignored.
 */
export function applyTicketOrder<T extends { id: string }>(tickets: T[], order: string[]): T[] {
  if (order.length === 0) return tickets;

  const position = new Map(order.map((id, index) => [id, index]));
  const ranked = tickets.filter((ticket) => position.has(ticket.id));
  const rest = tickets.filter((ticket) => !position.has(ticket.id));

  ranked.sort((a, b) => position.get(a.id)! - position.get(b.id)!);
  return [...ranked, ...rest];
}

/**
 * The order to store after a drag. `visibleIds` is the list as it was on screen after the move,
 * which may be a filtered view; ids saved earlier that are not on screen keep their relative order
 * and sit after the visible ones, so filtering to one queue and dragging does not forget the rest.
 */
export function mergeTicketOrder(visibleIds: string[], previous: string[], limit = 1000): string[] {
  const shown = new Set(visibleIds);
  return [...visibleIds, ...previous.filter((id) => !shown.has(id))].slice(0, limit);
}
