/**
 * Weeks start on Monday.
 *
 * Every timesheet, lock and report anchors to the same boundary, computed in one place. Getting
 * this wrong by a day is the kind of error that only shows up when two reports disagree.
 */

export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const daysSinceMonday = (day + 6) % 7;

  result.setDate(result.getDate() - daysSinceMonday);
  result.setHours(0, 0, 0, 0);

  return result;
}

export function endOfWeek(date: Date): Date {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 7);
  return result;
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * A day as people write it: 2026-09-18, in the reader's own time.
 *
 * toISOString would answer in UTC, which for anyone east of Greenwich turns local midnight into
 * the previous evening and reports Friday's work as Thursday's. Every place a work date is written
 * down as text goes through here.
 */
export function toDateKey(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function daysOfWeek(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + index);
    return day;
  });
}

/** 95 minutes reads as 1h 35m, which is how people talk about their day. */
export function formatMinutes(minutes: number): string {
  if (!minutes) return '0h';

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (!hours) return `${remainder}m`;
  if (!remainder) return `${hours}h`;

  return `${hours}h ${remainder}m`;
}

/** Accepts 1.5, 1:30 or 90m and returns minutes. */
export function parseDuration(input: string): number | null {
  const value = input.trim().toLowerCase();
  if (!value) return null;

  const colon = value.match(/^(\d+):([0-5]\d)$/);
  if (colon) return Number(colon[1]) * 60 + Number(colon[2]);

  const minutesOnly = value.match(/^(\d+(?:\.\d+)?)\s*m(?:in)?$/);
  if (minutesOnly) return Math.round(Number(minutesOnly[1]));

  const hoursOnly = value.match(/^(\d+(?:\.\d+)?)\s*h?(?:ours?)?$/);
  if (hoursOnly) return Math.round(Number(hoursOnly[1]) * 60);

  return null;
}
