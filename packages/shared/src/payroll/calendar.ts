// Date helpers. All dates are ISO "YYYY-MM-DD" in the tenant's local calendar (UTC math, no time part).
import type { PayrollSettings } from './schemas';

const DAY = 86_400_000;
export const parse = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
export const fmt = (t: number) => new Date(t).toISOString().slice(0, 10);

export function periodBounds(period: string): { start: string; end: string; days: number } {
  const y = +period.slice(0, 4),
    m = +period.slice(5, 7);
  const start = Date.UTC(y, m - 1, 1),
    end = Date.UTC(y, m, 0);
  return { start: fmt(start), end: fmt(end), days: (end - start) / DAY + 1 };
}

export function* eachDay(from: string, to: string) {
  for (let t = parse(from); t <= parse(to); t += DAY) yield fmt(t);
}

export const isWorkingDay = (d: string, s: Pick<PayrollSettings, 'weekendDays' | 'holidays'>) =>
  !s.weekendDays.includes(new Date(parse(d)).getUTCDay()) && !s.holidays.includes(d);

export const maxDate = (a: string, b: string) => (a > b ? a : b);
export const minDate = (a: string, b: string) => (a < b ? a : b);

/** Days in [from,to] that count for pay under the tenant's day basis. */
export function countDays(from: string, to: string, s: PayrollSettings): number {
  if (from > to) return 0;
  let n = 0;
  for (const d of eachDay(from, to)) if (s.dayBasis !== 'working' || isWorkingDay(d, s)) n++;
  return n;
}

/** Denominator for proration in a period. */
export function basisDays(period: string, s: PayrollSettings): number {
  const { start, end, days } = periodBounds(period);
  if (s.dayBasis === 'fixed30') return 30;
  if (s.dayBasis === 'calendar') return days;
  return countDays(start, end, s);
}

export const addMonths = (period: string, n: number): string => {
  const y = +period.slice(0, 4),
    m = +period.slice(5, 7) - 1 + n;
  const yy = y + Math.floor(m / 12),
    mm = ((m % 12) + 12) % 12;
  return `${yy}-${String(mm + 1).padStart(2, '0')}`;
};

/** Pay window for a period: days fromDay..toDay of the following month. */
export function payWindowFor(period: string, w: { fromDay: number; toDay: number }) {
  const next = addMonths(period, 1);
  const d = (n: number) => `${next}-${String(n).padStart(2, '0')}`;
  return { from: d(w.fromDay), to: d(w.toDay) };
}
