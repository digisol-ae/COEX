/**
 * What a contract is today, given what a person decided and the calendar.
 *
 * Pure and dependency free so the rule that drives every warning can be tested without a database.
 */

export type StoredContractStatus = 'draft' | 'active' | 'renewed' | 'cancelled';
export type ContractStatus = StoredContractStatus | 'expiring' | 'expired';

export const DEFAULT_EXPIRY_WARNING_DAYS = 30;

/** Calendar day as YYYY-MM-DD in the office time zone, so "today" matches what the team sees. */
export function todayKey(now: Date = new Date(), timeZone = 'Asia/Dubai'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from one calendar day to another. Negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  // Both parsed as UTC midnight, so daylight saving can never add or remove an hour.
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function deriveContractStatus(
  contract: { status: StoredContractStatus; endDate: string },
  today: string,
  warningDays: number = DEFAULT_EXPIRY_WARNING_DAYS,
): ContractStatus {
  // Only an active contract can run out. A renewed one has been replaced, so its end date is no
  // longer a warning, and a draft or cancelled one was never in force.
  if (contract.status !== 'active') return contract.status;

  const daysLeft = daysBetween(today, contract.endDate);

  if (daysLeft < 0) return 'expired';
  if (daysLeft < warningDays) return 'expiring';
  return 'active';
}

/** True from the warning threshold onwards, including after expiry. */
export function needsExpiryWarning(status: ContractStatus): boolean {
  return status === 'expiring' || status === 'expired';
}

export function addDays(day: string, days: number): string {
  const result = new Date(`${day}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

/**
 * The dates a renewal starts and ends: the day after the old term, for the same length.
 *
 * A year is kept as a calendar year, so a contract running 1 January to 31 December renews to the
 * same dates a year on rather than drifting a day in a leap year.
 */
export function renewalTerm(
  startDate: string,
  endDate: string,
): { startDate: string; endDate: string } {
  const newStart = addDays(endDate, 1);
  const length = daysBetween(startDate, endDate) + 1;

  if (length === 365 || length === 366) {
    const end = new Date(`${newStart}T00:00:00Z`);
    end.setUTCFullYear(end.getUTCFullYear() + 1);
    return { startDate: newStart, endDate: addDays(end.toISOString().slice(0, 10), -1) };
  }

  return { startDate: newStart, endDate: addDays(newStart, length - 1) };
}

/**
 * Which reminder, if any, is due now. Each threshold is sent once. When several have been crossed
 * at once (a contract added late, or the worker was down) one email covers them all, and all are
 * marked sent, so nobody receives a burst of reminders for the same contract.
 */
export function reminderDue(
  daysLeft: number,
  thresholds: readonly number[],
  alreadySent: readonly number[],
): { send: boolean; markSent: number[] } {
  const crossed = thresholds.filter((threshold) => daysLeft <= threshold);
  const pending = crossed.filter((threshold) => !alreadySent.includes(threshold));

  return { send: pending.length > 0, markSent: pending };
}
