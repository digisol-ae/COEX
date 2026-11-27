// Payroll calculation engine: pure functions, no DB access.
// Input = one employee + all their data for a period. Output = one payslip.
import { basisDays, countDays, maxDate, minDate, periodBounds } from './calendar';
import { unpaidLeaveDays } from './leave';
import { dueForPeriod } from './loans';
import { fromMinor, mulRatio, sum, toMinor, type Minor } from './money';
import type {
  Employee,
  LeaveRequest,
  LeaveType,
  Loan,
  PayrollSettings,
  Reimbursement,
  RunInput,
  SalaryAssignment,
  SalaryComponent,
  SalaryStructure,
} from './schemas';

export type PayslipLine = {
  code: string;
  name: string;
  type: 'earning' | 'deduction';
  amount: number;
  glAccount: string;
  source: 'component' | 'overtime' | 'adjustment' | 'reimbursement' | 'loan';
  refId?: string;
  note?: string;
};

export type Payslip = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  period: string;
  currency: string;
  basisDays: number;
  employedDays: number;
  unpaidDays: number;
  payableDays: number;
  lines: PayslipLine[];
  gross: number;
  totalDeductions: number;
  net: number;
  loanRecoveries: { loanId: string; amount: number; due: number }[];
  reimbursementIds: string[];
  warnings: string[];
  hold: boolean;
  /** Items over the approval limit not yet approved; blocks run approval */
  pendingApprovals: number;
};

export type EmployeeContext = {
  settings: PayrollSettings;
  period: string;
  employee: Employee;
  structure: SalaryStructure;
  assignment: SalaryAssignment;
  leaveTypes: LeaveType[];
  leaveRequests: LeaveRequest[];
  loans: Loan[];
  reimbursements: Reimbursement[];
  input?: RunInput;
};

export class PayrollError extends Error {}

/** Resolve full (un-prorated) monthly amounts for every component, following percent dependencies. */
export function resolveComponents(
  components: SalaryComponent[],
  amounts: Record<string, number>,
  pkg?: number,
): Map<string, Minor> {
  const balances = components.filter((c) => c.calc.kind === 'balance');
  const needsPkg = components.some(
    (c) => c.calc.kind === 'package_percent' || c.calc.kind === 'balance',
  );
  if (balances.length > 1) throw new PayrollError('Only one balance component is allowed');
  if (needsPkg && pkg === undefined)
    throw new PayrollError('Monthly package is required for this salary structure');
  const pkgM = toMinor(pkg ?? 0);
  const byCode = new Map(components.map((c) => [c.code, c]));
  const out = new Map<string, Minor>();
  const visiting = new Set<string>();
  const resolve = (code: string): Minor => {
    if (out.has(code)) return out.get(code)!;
    const c = byCode.get(code);
    if (!c) throw new PayrollError(`Component ${code} is referenced but not in the structure`);
    if (visiting.has(code)) throw new PayrollError(`Circular percentage reference at ${code}`);
    visiting.add(code);
    const calc = c.calc;
    let v: Minor;
    if (calc.kind === 'fixed') v = toMinor(amounts[code] ?? 0);
    else if (calc.kind === 'percent') v = mulRatio(resolve(calc.of), calc.rate / 100);
    else if (calc.kind === 'package_percent') v = mulRatio(pkgM, calc.rate / 100);
    else {
      const others = components.filter((x) => x.type === 'earning' && x.code !== code);
      v = pkgM - others.reduce((a, x) => a + resolve(x.code), 0);
      if (v < 0)
        throw new PayrollError(
          `Balance component ${code} is negative: earnings exceed the package`,
        );
    }
    visiting.delete(code);
    out.set(code, v);
    return v;
  };
  components.forEach((c) => resolve(c.code));
  return out;
}

/** Returns null when the employee was not employed during the period. */
export function calculatePayslip(ctx: EmployeeContext): Payslip | null {
  const { settings: s, period, employee: e, structure, assignment, input } = ctx;
  if (assignment.employeeId !== e.id)
    throw new PayrollError('Assignment does not belong to employee');
  if (assignment.structureId !== structure.id)
    throw new PayrollError('Assignment structure mismatch');

  const { start, end, days: calDays } = periodBounds(period);
  const from = maxDate(e.joinDate, start);
  const to = e.exitDate ? minDate(e.exitDate, end) : end;
  if (from > to) return null;

  const warnings: string[] = [];
  const basis = basisDays(period, s);
  let employed: number;
  if (s.dayBasis === 'fixed30') {
    const notEmployed = calDays - countDays(from, to, { ...s, dayBasis: 'calendar' });
    employed = Math.max(0, 30 - notEmployed);
  } else employed = countDays(from, to, s);

  const unpaid =
    input?.unpaidDaysOverride ??
    unpaidLeaveDays(ctx.leaveRequests, ctx.leaveTypes, e.id, from, to, s);
  if (unpaid > employed)
    warnings.push(`Unpaid days (${unpaid}) exceed employed days (${employed}); capped`);
  const payable = Math.max(0, employed - unpaid);
  const factor = payable / basis;

  const full = resolveComponents(structure.components, assignment.amounts, assignment.package);
  const lines: (PayslipLine & { minor: Minor })[] = [];
  for (const c of structure.components) {
    const m = c.prorate ? mulRatio(full.get(c.code)!, factor) : full.get(c.code)!;
    const gl =
      c.type === 'earning' && c.postTo !== 'component' && e.glExpenseAccount
        ? e.glExpenseAccount
        : c.glAccount;
    if (m !== 0 || c.calc.kind !== 'percent')
      lines.push({
        code: c.code,
        name: c.name,
        type: c.type,
        glAccount: gl,
        source: 'component',
        amount: 0,
        minor: m,
      });
  }

  // Overtime
  const ot = input?.overtimeHours ?? 0;
  if (ot > 0) {
    const base = full.get(s.rateBaseComponent);
    if (base === undefined)
      warnings.push(`Overtime skipped: rate base ${s.rateBaseComponent} not in structure`);
    else {
      const m = mulRatio(base, (ot * s.overtimeMultiplier) / (basis * s.hoursPerDay));
      const gl =
        e.glExpenseAccount ??
        structure.components.find((c) => c.code === s.rateBaseComponent)!.glAccount;
      lines.push({
        code: 'OT',
        name: `Overtime (${ot} h × ${s.overtimeMultiplier})`,
        type: 'earning',
        glAccount: gl,
        source: 'overtime',
        amount: 0,
        minor: m,
      });
    }
  }

  for (const a of input?.adjustments ?? [])
    lines.push({
      code: a.code,
      name: a.name,
      type: a.type,
      glAccount: a.glAccount,
      source: 'adjustment',
      note: a.showNote === false ? undefined : a.note,
      refId: a.ref?.id,
      amount: 0,
      minor: toMinor(a.amount),
    });
  const unapproved = (input?.adjustments ?? []).filter(
    (a) => a.approval?.required && !a.approval.approvedBy,
  );
  if (unapproved.length)
    warnings.push(`${unapproved.length} item(s) awaiting approval (over limit)`);

  const reimb = ctx.reimbursements.filter(
    (r) => r.employeeId === e.id && r.status === 'approved' && r.payPeriod === period,
  );
  for (const r of reimb)
    lines.push({
      code: 'REIMB',
      name: `Reimbursement – ${r.category}`,
      type: 'earning',
      glAccount: s.gl.reimbursementExpense,
      source: 'reimbursement',
      refId: r.id,
      amount: 0,
      minor: toMinor(r.amount),
    });

  const grossM = sum(lines.filter((l) => l.type === 'earning').map((l) => l.minor));
  let dedM = sum(lines.filter((l) => l.type === 'deduction').map((l) => l.minor));

  // Loan recovery, capped so net stays >= minNetPctOfGross of gross.
  const floorNet = mulRatio(grossM, s.minNetPctOfGross / 100);
  const loanRecoveries: Payslip['loanRecoveries'] = [];
  const loans = ctx.loans
    .filter((l) => l.employeeId === e.id)
    .sort((a, b) => a.startPeriod.localeCompare(b.startPeriod));
  for (const l of loans) {
    const dueM = toMinor(dueForPeriod(l, period));
    if (dueM <= 0) continue;
    const room = Math.max(0, grossM - dedM - floorNet);
    const take = Math.min(dueM, room);
    if (take < dueM)
      warnings.push(
        `${l.kind} ${l.id}: recovered ${fromMinor(take)} of ${fromMinor(dueM)} (net-pay floor ${s.minNetPctOfGross}%)`,
      );
    if (take > 0) {
      lines.push({
        code: l.kind === 'loan' ? 'LOAN' : 'ADVANCE',
        name: l.kind === 'loan' ? 'Loan installment' : 'Advance recovery',
        type: 'deduction',
        glAccount: s.gl.loanReceivable,
        source: 'loan',
        refId: l.id,
        amount: 0,
        minor: take,
      });
      dedM += take;
    }
    loanRecoveries.push({ loanId: l.id, amount: fromMinor(take), due: fromMinor(dueM) });
  }

  const netM = grossM - dedM;
  if (netM < 0) warnings.push('Net pay is negative; review deductions');
  if (e.payment.method === 'bank' && !e.payment.iban && !e.payment.accountNo)
    warnings.push('Bank details missing');
  if (e.status === 'on_hold') warnings.push('Employee is on hold');

  return {
    employeeId: e.id,
    employeeCode: e.code,
    employeeName: e.name,
    period,
    currency: e.currency,
    basisDays: basis,
    employedDays: employed,
    unpaidDays: Math.min(unpaid, employed),
    payableDays: payable,
    lines: lines.map(({ minor, ...l }) => ({ ...l, amount: fromMinor(minor) })),
    gross: fromMinor(grossM),
    totalDeductions: fromMinor(dedM),
    net: fromMinor(netM),
    loanRecoveries,
    reimbursementIds: reimb.map((r) => r.id),
    warnings,
    hold: Boolean(input?.hold) || e.status === 'on_hold',
    pendingApprovals: unapproved.length,
  };
}

/** Pick the assignment in force on the last day of the period. */
export function assignmentFor(assignments: SalaryAssignment[], employeeId: string, period: string) {
  const { end } = periodBounds(period);
  return assignments
    .filter((a) => a.employeeId === employeeId && a.effectiveFrom <= end)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}
