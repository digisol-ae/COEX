// Leave day counting and balances.
import { eachDay, isWorkingDay, maxDate, minDate, periodBounds } from './calendar';
import type { LeaveRequest, LeaveType, PayrollSettings } from './schemas';

/** Working days of a leave request that fall inside [from,to]. Half day counts 0.5. */
export function leaveDaysInRange(
  req: LeaveRequest,
  from: string,
  to: string,
  s: PayrollSettings,
): number {
  const a = maxDate(req.from, from),
    b = minDate(req.to, to);
  if (a > b) return 0;
  let n = 0;
  for (const d of eachDay(a, b)) if (isWorkingDay(d, s)) n++;
  return req.halfDay ? n * 0.5 : n;
}

/** Approved unpaid leave days for an employee within a period range. */
export function unpaidLeaveDays(
  reqs: LeaveRequest[],
  types: LeaveType[],
  employeeId: string,
  from: string,
  to: string,
  s: PayrollSettings,
): number {
  const unpaid = new Set(types.filter((t) => !t.paid).map((t) => t.code));
  return reqs
    .filter((r) => r.employeeId === employeeId && r.status === 'approved' && unpaid.has(r.typeCode))
    .reduce((acc, r) => acc + leaveDaysInRange(r, from, to, s), 0);
}

/**
 * Leave balance on a date for one leave type.
 * Monthly accrual: entitlement/12 per completed month of service in the leave year.
 * Yearly: full entitlement on 1 Jan (pro-rated by months remaining in the join year).
 * carriedForward is the opening balance brought from last year (already capped).
 */
export function leaveBalance(opts: {
  type: LeaveType;
  joinDate: string;
  asOf: string;
  year: number;
  carriedForward?: number;
  requests: LeaveRequest[];
  employeeId: string;
  settings: PayrollSettings;
}): { accrued: number; taken: number; pending: number; balance: number } {
  const { type, joinDate, asOf, year, settings: s } = opts;
  const yStart = `${year}-01-01`,
    yEnd = `${year}-12-31`;
  const from = maxDate(joinDate, yStart);
  let accrued = 0;
  if (from <= asOf) {
    if (type.accrual === 'yearly') {
      const startMonth = +from.slice(5, 7);
      accrued = (type.annualEntitlement * (13 - startMonth)) / 12;
    } else {
      // credited at each month end reached between `from` and `asOf`
      let months = 0;
      for (let m = 1; m <= 12; m++) {
        const monthEnd = periodBounds(`${year}-${String(m).padStart(2, '0')}`).end;
        if (monthEnd >= from && monthEnd <= asOf) months++;
      }
      accrued = (type.annualEntitlement / 12) * months;
    }
  }
  const mine = opts.requests.filter(
    (r) => r.employeeId === opts.employeeId && r.typeCode === type.code,
  );
  const sumIn = (st: LeaveRequest['status']) =>
    mine
      .filter((r) => r.status === st)
      .reduce((a, r) => a + leaveDaysInRange(r, yStart, yEnd, s), 0);
  const taken = sumIn('approved'),
    pending = sumIn('pending');
  const round = (x: number) => Math.round(x * 100) / 100;
  accrued = round(accrued + (opts.carriedForward ?? 0));
  return { accrued, taken, pending, balance: round(accrued - taken) };
}

/** Carry-forward into next year, capped by the leave type. */
export const carryForward = (balance: number, type: LeaveType) =>
  Math.max(0, Math.min(balance, type.carryForwardMax));
