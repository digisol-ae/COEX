import { describe, expect, it } from 'vitest';
import {
  addWorkingMinutes,
  nextWorkingMoment,
  workingMinutesBetween,
  type WorkingCalendar,
} from '@/modules/tickets/business-hours';

/**
 * Pure arithmetic, no database. These are the tests that stop a four hour response target from
 * expiring overnight or over a weekend, which is the most common way service level reporting
 * quietly becomes fiction.
 */

const calendar: WorkingCalendar = {
  workingDays: [1, 2, 3, 4, 5],
  dayStartMinutes: 9 * 60,
  dayEndMinutes: 18 * 60,
};

// Friday 17:00, Saturday 11:00, Monday 08:00 and Monday 10:00 in September 2026.
const fridayLate = new Date('2026-09-18T17:00:00');
const saturday = new Date('2026-09-19T11:00:00');
const mondayEarly = new Date('2026-09-21T08:00:00');
const mondayMorning = new Date('2026-09-21T10:00:00');

describe('finding the next working moment', () => {
  it('leaves a moment inside working hours alone', () => {
    expect(nextWorkingMoment(mondayMorning, calendar).toISOString()).toBe(
      mondayMorning.toISOString(),
    );
  });

  it('moves the weekend to Monday morning', () => {
    const result = nextWorkingMoment(saturday, calendar);

    expect(result.getDay()).toBe(1);
    expect(result.getHours()).toBe(9);
  });

  it('moves before opening to opening, and after closing to the next day', () => {
    expect(nextWorkingMoment(mondayEarly, calendar).getHours()).toBe(9);

    const afterFriday = nextWorkingMoment(new Date('2026-09-18T19:00:00'), calendar);
    expect(afterFriday.getDay()).toBe(1);
  });
});

describe('adding working minutes', () => {
  it('adds within the same day', () => {
    const due = addWorkingMinutes(mondayMorning, 120, calendar);

    expect(due.getDate()).toBe(21);
    expect(due.getHours()).toBe(12);
  });

  it('carries a four hour target on Friday evening into Monday rather than overnight', () => {
    const due = addWorkingMinutes(fridayLate, 240, calendar);

    // One working hour remains on Friday, so three hours land on Monday at noon.
    expect(due.getDay()).toBe(1);
    expect(due.getHours()).toBe(12);
  });

  it('starts the clock on Monday for a ticket raised at the weekend', () => {
    const due = addWorkingMinutes(saturday, 60, calendar);

    expect(due.getDay()).toBe(1);
    expect(due.getHours()).toBe(10);
  });

  it('spans several days when the target is longer than a working day', () => {
    // Twenty working hours from Monday 10:00: eight hours left on Monday, nine on Tuesday, then
    // three on Wednesday morning.
    const due = addWorkingMinutes(mondayMorning, 20 * 60, calendar);

    expect(due.getDate()).toBe(23);
    expect(due.getHours()).toBe(12);
  });
});

describe('measuring working minutes', () => {
  it('counts only working time between two moments', () => {
    expect(workingMinutesBetween(mondayMorning, new Date('2026-09-21T12:00:00'), calendar)).toBe(
      120,
    );
  });

  it('ignores the weekend', () => {
    // Friday 17:00 to Monday 10:00 is one working hour on Friday plus one on Monday.
    expect(workingMinutesBetween(fridayLate, mondayMorning, calendar)).toBe(120);
  });

  it('returns nothing when the end is before the start', () => {
    expect(workingMinutesBetween(mondayMorning, fridayLate, calendar)).toBe(0);
  });
});
