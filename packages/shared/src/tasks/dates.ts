import { officeInstant } from './office-day';

/**
 * Helpers for the planned window.
 *
 * Every time a person types, picks or reads on a task is office time, Asia/Dubai, whatever the
 * browser's or the server's own clock says (John's team, 15 Oct 2026: a start of 9:00 came back as
 * 10:00). The old code turned the typed wall-clock text into an instant with the server's timezone
 * and read it back with the browser's, so any two clocks that disagreed moved the time. Now there is
 * one zone, named here, used to turn text into an instant, an instant into text and text into words.
 * The same constant is used in the browser and on the server, so a page never disagrees with itself.
 */

export const TASK_TIME_ZONE = 'Asia/Dubai';

const INPUT_PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/;

/** What a datetime input sends (2026-09-21T09:00, no zone) becomes the instant it means in office time. */
export function parseDateTimeInput(value: string | null | undefined): Date | null {
  if (!value) return null;

  const match = INPUT_PATTERN.exec(value.trim());
  // A value that already names its zone (an ISO string with Z or an offset) is an exact instant.
  if (!match) {
    const exact = new Date(value);
    return Number.isNaN(exact.getTime()) ? null : exact;
  }

  const instant = officeInstant(match[1], Number(match[2]), Number(match[3]), 0, TASK_TIME_ZONE);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

export function toDateTimeInput(value: Date | string | null | undefined): string {
  if (!value) return '';

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TASK_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/** Short form for lists: 21 Sep 09:00, with the year only when it is not this one. */
export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return '';

  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';

  const year = (instant: Date) =>
    new Intl.DateTimeFormat('en-GB', { timeZone: TASK_TIME_ZONE, year: 'numeric' }).format(instant);
  const sameYear = year(date) === year(new Date());

  return date.toLocaleString('en-GB', {
    timeZone: TASK_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Phone task cards need a date that never steals space from the task title. */
export function formatCompactDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TASK_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}
