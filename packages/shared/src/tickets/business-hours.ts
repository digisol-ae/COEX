/**
 * Business hours arithmetic for service level targets.
 *
 * A four hour response target promised on a Thursday afternoon must not expire overnight, and a
 * ticket raised at the weekend cannot be late before anyone has had the chance to read it. So
 * targets are measured in working minutes and the clock only runs during the working week.
 *
 * All of this is pure arithmetic on purpose: it is the kind of logic that is easy to get subtly
 * wrong and impossible to check by hand once it is buried in a service.
 */

export interface WorkingCalendar {
  /** 0 is Sunday, matching JavaScript. The Gulf working week is Monday to Friday. */
  workingDays: number[];
  /** Minutes from midnight, so 8:30 is 510. */
  dayStartMinutes: number;
  dayEndMinutes: number;
}

export const DEFAULT_CALENDAR: WorkingCalendar = {
  workingDays: [1, 2, 3, 4, 5],
  dayStartMinutes: 9 * 60,
  dayEndMinutes: 18 * 60,
};

function minutesIntoDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function isWorkingDay(date: Date, calendar: WorkingCalendar): boolean {
  return calendar.workingDays.includes(date.getDay());
}

function startOfNextWorkingDay(date: Date, calendar: WorkingCalendar): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  next.setHours(0, calendar.dayStartMinutes, 0, 0);

  while (!isWorkingDay(next, calendar)) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

/** Moves a moment forward to the next instant the team is actually working. */
export function nextWorkingMoment(from: Date, calendar = DEFAULT_CALENDAR): Date {
  const moment = new Date(from);

  if (!isWorkingDay(moment, calendar)) {
    return startOfNextWorkingDay(moment, calendar);
  }

  const intoDay = minutesIntoDay(moment);

  if (intoDay < calendar.dayStartMinutes) {
    moment.setHours(0, calendar.dayStartMinutes, 0, 0);
    return moment;
  }

  if (intoDay >= calendar.dayEndMinutes) {
    return startOfNextWorkingDay(moment, calendar);
  }

  return moment;
}

/** Adds working minutes, skipping evenings and non working days. */
export function addWorkingMinutes(from: Date, minutes: number, calendar = DEFAULT_CALENDAR): Date {
  let remaining = Math.max(0, Math.round(minutes));
  let cursor = nextWorkingMoment(from, calendar);

  while (remaining > 0) {
    const availableToday = calendar.dayEndMinutes - minutesIntoDay(cursor);

    if (remaining < availableToday) {
      cursor = new Date(cursor.getTime() + remaining * 60_000);
      remaining = 0;
      break;
    }

    remaining -= availableToday;
    cursor = startOfNextWorkingDay(cursor, calendar);
  }

  return cursor;
}

/** Working minutes between two moments, which is how response time is reported. */
export function workingMinutesBetween(from: Date, to: Date, calendar = DEFAULT_CALENDAR): number {
  if (to <= from) return 0;

  let total = 0;
  let cursor = nextWorkingMoment(from, calendar);

  while (cursor < to) {
    const endOfDay = new Date(cursor);
    endOfDay.setHours(0, calendar.dayEndMinutes, 0, 0);

    const segmentEnd = to < endOfDay ? to : endOfDay;
    total += Math.max(0, Math.round((segmentEnd.getTime() - cursor.getTime()) / 60_000));

    if (to <= endOfDay) break;

    cursor = startOfNextWorkingDay(cursor, calendar);
  }

  return total;
}

/**
 * A target read back in the words people use.
 *
 * Targets are stored in working minutes, and "1440 minutes" tells nobody anything. Anything under
 * a working day reads in hours; beyond that it reads in working days, because that is how the
 * promise was made in the first place.
 */
export function formatWorkingMinutes(minutes: number, calendar = DEFAULT_CALENDAR): string {
  const dayMinutes = Math.max(1, calendar.dayEndMinutes - calendar.dayStartMinutes);

  if (minutes < 60) return `${minutes}m`;

  if (minutes < dayMinutes) {
    const hours = minutes / 60;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
  }

  const days = minutes / dayMinutes;
  const rounded = Number.isInteger(days) ? days : Number(days.toFixed(1));

  return `${rounded} working ${rounded === 1 ? 'day' : 'days'}`;
}
