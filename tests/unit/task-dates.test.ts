import { describe, expect, it } from 'vitest';
import {
  formatCompactDate,
  formatDateTime,
  parseDateTimeInput,
  toDateTimeInput,
} from '@coex/shared/tasks/dates';

describe('task dates are office time', () => {
  it('reads what a datetime input sends as Dubai time, whatever the machine clock says', () => {
    expect(parseDateTimeInput('2026-10-15T09:00')?.toISOString()).toBe('2026-10-15T05:00:00.000Z');
    expect(parseDateTimeInput('2026-10-15T10:00')?.toISOString()).toBe('2026-10-15T06:00:00.000Z');
  });

  it('shows the same text back, so 9:00 stays 9:00 and 10:00 stays 10:00', () => {
    for (const typed of ['2026-10-15T09:00', '2026-10-15T10:00', '2026-12-31T23:30']) {
      expect(toDateTimeInput(parseDateTimeInput(typed))).toBe(typed);
    }
  });

  it('keeps an exact instant exact when the value already names its zone', () => {
    expect(parseDateTimeInput('2026-10-15T05:00:00.000Z')?.toISOString()).toBe(
      '2026-10-15T05:00:00.000Z',
    );
  });

  it('refuses text that is not a date and treats empty as no date', () => {
    expect(parseDateTimeInput('')).toBeNull();
    expect(parseDateTimeInput(null)).toBeNull();
    expect(parseDateTimeInput('not a date')).toBeNull();
  });

  it('writes lists in office time too', () => {
    expect(formatDateTime(new Date('2026-10-15T05:00:00Z'))).toContain('09:00');
    expect(formatCompactDate(new Date('2026-10-15T21:00:00Z'))).toBe('16/10');
  });
});
