import { describe, expect, it } from 'vitest';
import { applyTicketOrder, mergeTicketOrder } from '@/modules/tickets/ticket-order';

const list = ['a', 'b', 'c', 'd'].map((id) => ({ id }));

describe('applyTicketOrder', () => {
  it('leaves the list alone when nothing was dragged', () => {
    expect(applyTicketOrder(list, []).map((t) => t.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('puts dragged tickets first in the saved order and keeps the rest as they were', () => {
    expect(applyTicketOrder(list, ['c', 'a']).map((t) => t.id)).toEqual(['c', 'a', 'b', 'd']);
  });

  it('ignores saved ids that are no longer in the list', () => {
    expect(applyTicketOrder(list, ['gone', 'd']).map((t) => t.id)).toEqual(['d', 'a', 'b', 'c']);
  });
});

describe('mergeTicketOrder', () => {
  it('keeps earlier positions of tickets hidden by the current filter', () => {
    expect(mergeTicketOrder(['b', 'a'], ['x', 'a', 'y'])).toEqual(['b', 'a', 'x', 'y']);
  });

  it('caps the stored list', () => {
    expect(mergeTicketOrder(['a', 'b', 'c'], [], 2)).toEqual(['a', 'b']);
  });
});
