import { describe, expect, it } from 'vitest';
import {
  GANTT_DAY,
  officeDayStart,
  scheduleRange,
  shiftedSchedule,
  validSchedule,
} from '@coex/shared/tasks/gantt';
describe('Gantt office dates', () => {
  it('keeps Dubai midnight independent of browser/server timezone', () => {
    const original = process.env.TZ;
    try {
      for (const zone of ['UTC', 'Asia/Karachi', 'America/New_York']) {
        process.env.TZ = zone;
        expect(officeDayStart('2026-10-22T23:30:00+04:00')).toBe(
          Date.parse('2026-10-22T00:00:00+04:00'),
        );
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
  it('puts 09:00 at the same fractional office day as its displayed time', () => {
    const start = officeDayStart('2026-10-19T09:00:00+04:00');
    expect(((Date.parse('2026-10-19T09:00:00+04:00') - start) / GANTT_DAY) * 56).toBe(21);
  });
  it('keeps a midnight-crossing task in its correct date cells', () => {
    const start = officeDayStart('2026-10-19T09:00:00+04:00');
    expect(((Date.parse('2026-10-22T23:30:00+04:00') - start) / GANTT_DAY) * 56).toBeCloseTo(
      222.833333,
    );
  });
  it('ignores invalid/partial windows and includes today with a 14-day minimum', () => {
    expect(validSchedule(null, '2026-10-23T10:00Z')).toBe(false);
    expect(validSchedule('bad', '2026-10-23T10:00Z')).toBe(false);
    expect(validSchedule('2026-10-23T10:00Z', '2026-10-23T09:00Z')).toBe(false);
    expect(scheduleRange([{ startAt: null, endAt: null }], '2026-10-23T10:00Z')).toEqual({
      start: Date.parse('2026-10-23T00:00+04:00'),
      days: 14,
    });
  });
  it('moves dates together without changing duration and resizes just one edge', () => {
    const a = '2026-10-22T19:30:00.000Z',
      b = '2026-10-22T21:30:00.000Z';
    expect(shiftedSchedule(a, b, GANTT_DAY, 'move')).toEqual({
      startAt: '2026-10-23T19:30:00.000Z',
      endAt: '2026-10-23T21:30:00.000Z',
    });
    expect(shiftedSchedule(a, b, 1800000, 'end')).toEqual({
      startAt: a,
      endAt: '2026-10-22T22:00:00.000Z',
    });
  });
  it('prevents an edge crossing its opposite and rejects invalid operations', () => {
    const a = '2026-10-22T19:30:00Z',
      b = '2026-10-22T21:30:00Z';
    const next = shiftedSchedule(a, b, GANTT_DAY, 'start');
    expect(Date.parse(next.endAt) - Date.parse(next.startAt)).toBe(60000);
    expect(() => shiftedSchedule('bad', b, 1, 'move')).toThrow();
    expect(() => shiftedSchedule(a, b, Infinity, 'end')).toThrow();
  });
});
