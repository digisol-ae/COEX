import { expect, it } from 'vitest';
import { elapsedClock } from '@/modules/time/elapsed-clock';

it('renders seconds, minute/hour rollover and durations longer than a day', () => {
  const start = '2026-10-03T00:00:00Z';
  const time = Date.parse(start);
  expect(elapsedClock(start, time + 59_000)).toBe('00:00:59');
  expect(elapsedClock(start, time + 60_000)).toBe('00:01:00');
  expect(elapsedClock(start, time + 3_661_000)).toBe('01:01:01');
  expect(elapsedClock(start, time + 90_000_000)).toBe('25:00:00');
});
it('never shows negative time or NaN', () => {
  expect(elapsedClock('2026-10-03T00:00:00Z', 0)).toBe('00:00:00');
  expect(elapsedClock('invalid', 1000)).toBe('00:00:00');
});
