// Loan / advance installment logic.
import { addMonths } from './calendar';
import { fromMinor, toMinor } from './money';
import type { Loan } from './schemas';

/** Equal installments; the last one absorbs rounding so the total equals principal. */
export function schedule(
  loan: Pick<Loan, 'principal' | 'installments' | 'startPeriod' | 'skippedPeriods'>,
) {
  const p = toMinor(loan.principal),
    n = loan.installments;
  const base = Math.floor(p / n);
  const out: { period: string; amount: number }[] = [];
  let period = loan.startPeriod,
    i = 0;
  while (i < n) {
    if (!loan.skippedPeriods.includes(period)) {
      const amt = i === n - 1 ? p - base * (n - 1) : base;
      out.push({ period, amount: fromMinor(amt) });
      i++;
    }
    period = addMonths(period, 1);
  }
  return out;
}

/** Installment due in a period, never more than the outstanding balance. */
export function dueForPeriod(loan: Loan, period: string): number {
  if (loan.status !== 'active' && loan.status !== 'approved') return 0;
  const outstanding = toMinor(loan.principal) - toMinor(loan.recovered);
  if (outstanding <= 0) return 0;
  // Catch-up: if a past installment was not recovered (e.g. net-pay cap), the
  // amount due is the scheduled total up to this period minus what was recovered.
  const dueToDate = schedule(loan)
    .filter((r) => r.period <= period)
    .reduce((a, r) => a + toMinor(r.amount), 0);
  const due = Math.max(0, dueToDate - toMinor(loan.recovered));
  return fromMinor(Math.min(due, outstanding));
}
