import { expect, it } from 'vitest';
import { sinceLastActive } from '@coex/shared/time/last-active';

it('shows elapsed recorded work, running work and missing history honestly', () => {
  const now = new Date('2026-10-27T12:00:00Z');
  expect(sinceLastActive(new Date('2026-10-26T09:30:00Z'), false, now)).toBe('1d 2h ago');
  expect(sinceLastActive(new Date('2026-10-27T10:45:00Z'), false, now)).toBe('1h 15m ago');
  expect(sinceLastActive(null, false, now)).toBe('No recorded activity');
  expect(sinceLastActive(null, true, now)).toBe('Working now');
  expect(sinceLastActive(new Date('2026-10-28T12:00:00Z'), false, now)).toBe(
    'Less than a minute ago',
  );
});
