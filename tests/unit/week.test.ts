import { describe, expect, it } from 'vitest';
import { daysOfWeek, formatMinutes, parseDuration, startOfWeek } from '@/modules/time/week';
import { toCsv } from '@/modules/time/services/export.service';

/** Pure functions, no database. These run on every push. */

describe('weeks', () => {
  it('starts a week on Monday, whatever day is given', () => {
    // A Thursday, a Sunday and the Monday itself all resolve to the same Monday.
    expect(startOfWeek(new Date('2026-09-17T15:00:00')).toDateString()).toBe('Mon Sep 14 2026');
    expect(startOfWeek(new Date('2026-09-20T23:59:00')).toDateString()).toBe('Mon Sep 14 2026');
    expect(startOfWeek(new Date('2026-09-14T00:00:00')).toDateString()).toBe('Mon Sep 14 2026');
  });

  it('gives seven days from the Monday', () => {
    const days = daysOfWeek(startOfWeek(new Date('2026-09-17T15:00:00')));

    expect(days).toHaveLength(7);
    expect(days[0].toDateString()).toBe('Mon Sep 14 2026');
    expect(days[6].toDateString()).toBe('Sun Sep 20 2026');
  });
});

describe('durations', () => {
  it('reads the ways people actually write a duration', () => {
    expect(parseDuration('1.5')).toBe(90);
    expect(parseDuration('1:30')).toBe(90);
    expect(parseDuration('90m')).toBe(90);
    expect(parseDuration('2h')).toBe(120);
    expect(parseDuration('45 min')).toBe(45);
  });

  it('returns nothing for nonsense rather than guessing', () => {
    expect(parseDuration('')).toBeNull();
    expect(parseDuration('half an hour')).toBeNull();
    expect(parseDuration('1:75')).toBeNull();
  });

  it('formats minutes the way people say them', () => {
    expect(formatMinutes(95)).toBe('1h 35m');
    expect(formatMinutes(120)).toBe('2h');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(0)).toBe('0h');
  });
});

describe('csv', () => {
  it('quotes anything that would otherwise shift the columns', () => {
    const csv = toCsv([
      ['Task', 'Note'],
      ['DGS-T-1', 'Fixed the "urgent" issue, then tested'],
      ['DGS-T-2', 'Line one\nline two'],
    ]);

    expect(csv).toContain('"Fixed the ""urgent"" issue, then tested"');
    expect(csv).toContain('"Line one\nline two"');
  });

  it('starts with a byte order mark so Excel reads accented names correctly', () => {
    expect(toCsv([['Name'], ['Aún Ali']]).startsWith('﻿')).toBe(true);
  });
});
