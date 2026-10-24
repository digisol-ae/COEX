import { TASK_TIME_ZONE } from './dates';

export const GANTT_DAY = 86400000;
export const GANTT_MIN_DURATION = 60000;
export function officeDayStart(value: Date | string): number {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid schedule date.');
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TASK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  // Dubai is UTC+04:00 throughout the year; never use the browser/server local midnight.
  return Date.parse(`${get('year')}-${get('month')}-${get('day')}T00:00:00+04:00`);
}
export function validSchedule(start: string | Date | null, end: string | Date | null): boolean {
  if (!start || !end) return false;
  const a = new Date(start).getTime(),
    b = new Date(end).getTime();
  return Number.isFinite(a) && Number.isFinite(b) && b > a;
}
export function scheduleRange(
  windows: { startAt: Date | string | null; endAt: Date | string | null }[],
  now: string,
) {
  let first = officeDayStart(now),
    last = first;
  for (const row of windows)
    if (validSchedule(row.startAt, row.endAt)) {
      first = Math.min(first, officeDayStart(row.startAt!));
      last = Math.max(last, officeDayStart(row.endAt!));
    }
  return { start: first, days: Math.max(14, Math.round((last - first) / GANTT_DAY) + 1) };
}
export function shiftedSchedule(
  start: string,
  end: string,
  delta: number,
  mode: 'move' | 'start' | 'end',
) {
  let a = Date.parse(start),
    b = Date.parse(end);
  if (!validSchedule(start, end) || !Number.isFinite(delta)) throw new Error('Invalid schedule.');
  if (mode === 'move') {
    a += delta;
    b += delta;
  } else if (mode === 'start') a = Math.min(a + delta, b - GANTT_MIN_DURATION);
  else b = Math.max(b + delta, a + GANTT_MIN_DURATION);
  if (!Number.isFinite(new Date(a).getTime()) || !Number.isFinite(new Date(b).getTime()))
    throw new Error('Date is outside the supported range.');
  return { startAt: new Date(a).toISOString(), endAt: new Date(b).toISOString() };
}
