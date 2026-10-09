import { describe, expect, it } from 'vitest';
import { activityQuery, parseActivityParams } from '@/modules/time/activity-filter';

const today = '2026-10-09';

describe('activity filters', () => {
  it('defaults to today, everyone, tasks and tickets', () => {
    const filter = parseActivityParams({}, today);
    expect(filter).toMatchObject({ fromDay: today, toDay: today, kinds: ['task', 'ticket'] });
    expect(filter.userIds).toEqual([]);
  });

  it('reads several people and ignores bad ids and dates', () => {
    const id = 'a'.repeat(24);
    const filter = parseActivityParams(
      { person: [id, 'nope'], from: 'x', to: '2026-10-05' },
      today,
    );
    expect(filter.userIds).toEqual([id]);
    expect(filter.fromDay).toBe('2026-10-05');
  });

  it('puts the two dates in order', () => {
    const filter = parseActivityParams({ from: '2026-10-08', to: '2026-10-02' }, today);
    expect([filter.fromDay, filter.toDay]).toEqual(['2026-10-02', '2026-10-08']);
  });

  it('treats a submitted form with one box ticked as that kind only, and none as none', () => {
    expect(parseActivityParams({ shown: '1', kind: 'ticket' }, today).kinds).toEqual(['ticket']);
    expect(parseActivityParams({ shown: '1' }, today).kinds).toEqual([]);
  });

  it('round trips through the address query', () => {
    const filter = parseActivityParams({ shown: '1', kind: 'task', status: 'Done' }, today);
    const again = parseActivityParams(
      Object.fromEntries(new URLSearchParams(activityQuery(filter))),
      today,
    );
    expect(again).toEqual(filter);
  });
});
