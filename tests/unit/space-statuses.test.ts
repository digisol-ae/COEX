import { describe, expect, it } from 'vitest';
import { isDeskTaskDone } from '@/modules/tasks/services/desk.service';
import type { TaskSummary } from '@/modules/tasks/services/task.service';
import { assertUsedStatusesPreserved, validateSpaceStatuses } from '@coex/shared/tasks/statuses';
const original = [
  { name: 'To do', isClosed: false },
  { name: 'Done', isClosed: true },
];
describe('Space status configuration', () => {
  it('allows custom stages and trims their labels', () => {
    expect(
      validateSpaceStatuses([
        { name: ' Review ', isClosed: false },
        { name: 'Approved', isClosed: true },
      ])[0].name,
    ).toBe('Review');
  });
  it('requires unique names, an open status and one completed status', () => {
    expect(() =>
      validateSpaceStatuses([
        { name: 'Review', isClosed: false },
        { name: 'review', isClosed: true },
      ]),
    ).toThrow('unique');
    expect(() =>
      validateSpaceStatuses([
        { name: 'Review', isClosed: false },
        { name: 'Done', isClosed: false },
      ]),
    ).toThrow('completed');
    expect(() => validateSpaceStatuses([original[1]])).toThrow('between');
  });
  it('rejects malformed status data', () => {
    expect(() => validateSpaceStatuses([{ name: 7, isClosed: false }, original[1]])).toThrow(
      'name',
    );
  });
  it('prevents orphaning used statuses or changing task completion silently', () => {
    expect(() =>
      assertUsedStatusesPreserved(
        original,
        [{ name: 'Review', isClosed: false }, original[1]],
        ['To do'],
      ),
    ).toThrow('Move tasks');
    expect(() =>
      assertUsedStatusesPreserved(
        original,
        [
          { name: 'To do', isClosed: true },
          { name: 'Done', isClosed: false },
        ],
        ['To do'],
      ),
    ).toThrow('completion');
    expect(() =>
      assertUsedStatusesPreserved(
        original,
        [...original, { name: 'Review', isClosed: false }],
        ['To do'],
      ),
    ).not.toThrow();
  });
});

it('uses the configured completion flag instead of guessing from custom status names', () => {
  expect(isDeskTaskDone({ status: 'Incomplete', isClosed: false } as TaskSummary)).toBe(false);
  expect(isDeskTaskDone({ status: 'Approved', isClosed: true } as TaskSummary)).toBe(true);
});
