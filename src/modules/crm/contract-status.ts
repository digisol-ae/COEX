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
