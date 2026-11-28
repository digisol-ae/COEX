// Exports: Zoho Books manual-journal CSV and a generic bank transfer CSV.
// Column names follow Zoho Books' journal import; confirm against the tenant's
// Zoho import template before first use (Settings -> Import -> Journals).
import { fromMinor, toMinor } from './money';
import type { Employee, PayrollSettings } from './schemas';
import type { PayrollRun } from './run';

const esc = (v: string | number) => {
  const raw = String(v);
  const s = typeof v === 'string' && /^[=+@\-\t\r]/.test(raw) ? "\'" + raw : raw;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: (string | number)[][]) =>
  rows.map((r) => r.map(esc).join(',')).join('\n') + '\n';

export type JournalLine = { account: string; debit: number; credit: number; description: string };

/**
 * One balanced journal for the run (excluding held payslips):
 *   Dr  each earning GL (salary expense, overtime, reimbursements)
 *   Cr  each deduction GL (loan receivable, other deductions)
 *   Cr  Salaries Payable (net)
 */
export function journalLines(run: PayrollRun, s: PayrollSettings): JournalLine[] {
  const dr = new Map<string, number>(),
    cr = new Map<string, number>();
  let netM = 0;
  for (const p of run.payslips) {
    if (p.hold) continue;
    for (const l of p.lines) {
      const m = l.type === 'earning' ? dr : cr;
      m.set(l.glAccount, (m.get(l.glAccount) ?? 0) + toMinor(l.amount));
    }
    netM += toMinor(p.net);
  }
  const out: JournalLine[] = [];
  for (const [account, v] of dr)
    out.push({ account, debit: fromMinor(v), credit: 0, description: `Payroll ${run.period}` });
  for (const [account, v] of cr)
    out.push({
      account,
      debit: 0,
      credit: fromMinor(v),
      description: `Payroll ${run.period} deductions`,
    });
  out.push({
    account: s.gl.salaryPayable,
    debit: 0,
    credit: fromMinor(netM),
    description: `Net salaries ${run.period}`,
  });
  return out;
}

export function zohoJournalCsv(run: PayrollRun, s: PayrollSettings, journalDate: string): string {
  const lines = journalLines(run, s);
  const ref = `PAY-${run.period}`;
  return csv([
    [
      'Journal Date',
      'Reference Number',
      'Notes',
      'Journal Type',
      'Currency',
      'Account',
      'Description',
      'Debit',
      'Credit',
    ],
    ...lines.map((l) => [
      journalDate,
      ref,
      `Worktello payroll run ${run.period}`,
      'both',
      run.currency,
      l.account,
      l.description,
      l.debit ? l.debit.toFixed(2) : '',
      l.credit ? l.credit.toFixed(2) : '',
    ]),
  ]);
}

/** Payment journal when salaries are paid: Dr Salaries Payable, Cr Bank. */
export function paymentJournalCsv(
  run: PayrollRun,
  s: PayrollSettings,
  paymentDate: string,
): string | null {
  if (!s.gl.bank) return null; // no bank account mapped: record the payment in Zoho Books directly
  const net = run.payslips.filter((p) => !p.hold).reduce((a, p) => a + toMinor(p.net), 0);
  const ref = `PAYOUT-${run.period}`;
  return csv([
    [
      'Journal Date',
      'Reference Number',
      'Notes',
      'Journal Type',
      'Currency',
      'Account',
      'Description',
      'Debit',
      'Credit',
    ],
    [
      paymentDate,
      ref,
      `Salary payment ${run.period}`,
      'both',
      run.currency,
      s.gl.salaryPayable,
      'Salaries paid',
      fromMinor(net).toFixed(2),
      '',
    ],
    [
      paymentDate,
      ref,
      `Salary payment ${run.period}`,
      'both',
      run.currency,
      s.gl.bank!,
      'Salaries paid',
      '',
      fromMinor(net).toFixed(2),
    ],
  ]);
}

/** Generic bank upload file (bank-method employees only, not on hold, net > 0). */
export function bankTransferCsv(
  run: PayrollRun,
  employees: Employee[],
): { csv: string; skipped: { code: string; reason: string }[] } {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const rows: (string | number)[][] = [
    [
      'Employee Code',
      'Account Title',
      'Bank',
      'IBAN',
      'Account No',
      'Amount',
      'Currency',
      'Reference',
    ],
  ];
  const skipped: { code: string; reason: string }[] = [];
  for (const p of run.payslips) {
    const e = byId.get(p.employeeId)!;
    if (p.hold) {
      skipped.push({ code: p.employeeCode, reason: 'On hold' });
      continue;
    }
    if (p.net <= 0) {
      skipped.push({ code: p.employeeCode, reason: 'Net is zero or negative' });
      continue;
    }
    if (e.payment.method !== 'bank') {
      skipped.push({ code: p.employeeCode, reason: `Paid by ${e.payment.method}` });
      continue;
    }
    if (!e.payment.iban && !e.payment.accountNo) {
      skipped.push({ code: p.employeeCode, reason: 'Bank details missing' });
      continue;
    }
    rows.push([
      e.code,
      e.payment.accountTitle ?? e.name,
      e.payment.bankName ?? '',
      e.payment.iban ?? '',
      e.payment.accountNo ?? '',
      p.net.toFixed(2),
      p.currency,
      `SALARY ${run.period}`,
    ]);
  }
  return { csv: csv(rows), skipped };
}
