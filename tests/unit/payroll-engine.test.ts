import { describe, expect, it } from 'vitest';
import {
  payWindowFor,
  PayrollSettings,
  assignmentFor,
  bankTransferCsv,
  calculatePayslip,
  carryForward,
  journalLines,
  leaveBalance,
  PayrollError,
  postingEffects,
  resolveComponents,
  runTotals,
  schedule,
  dueForPeriod,
  transition,
  TransitionError,
  zohoJournalCsv,
  type Loan,
  type PayrollRun,
  type LeaveRequest,
  type EmployeeContext,
  type Payslip,
  type RunStatus,
} from '@coex/shared/payroll/index';
import { assignment, employee, leaveTypes, settings, structure } from './payroll-fixtures';

const base = (over: Partial<EmployeeContext> = {}) => ({
  settings: settings(),
  period: '2026-11',
  employee: employee(),
  structure,
  assignment,
  leaveTypes,
  leaveRequests: [],
  loans: [],
  reimbursements: [],
  ...over,
});
const line = (p: Payslip | null, code: string) => p?.lines.find((l) => l.code === code)?.amount;

describe('components', () => {
  it('resolves percent of another component', () => {
    const m = resolveComponents(structure.components, assignment.amounts);
    expect(m.get('HRA')).toBe(150000);
  });
  it('detects circular references', () => {
    const comps = [
      {
        ...structure.components[0],
        code: 'A',
        calc: { kind: 'percent' as const, of: 'B', rate: 10 },
      },
      {
        ...structure.components[0],
        code: 'B',
        calc: { kind: 'percent' as const, of: 'A', rate: 10 },
      },
    ];
    expect(() => resolveComponents(comps, {})).toThrow(PayrollError);
  });
});

describe('calculatePayslip', () => {
  it('full month', () => {
    const p = calculatePayslip(base())!;
    expect(p.gross).toBe(8500);
    expect(p.totalDeductions).toBe(100);
    expect(p.net).toBe(8400);
    expect(p.payableDays).toBe(30);
    expect(p.warnings).toEqual([]);
  });

  it('prorates a mid-month joiner (calendar basis)', () => {
    const p = calculatePayslip(base({ employee: employee({ joinDate: '2026-11-16' }) }))!;
    expect(p.employedDays).toBe(15);
    expect(line(p, 'BASIC')).toBe(3000);
    expect(line(p, 'MEDINS')).toBe(100); // not prorated
  });

  it('fixed30 basis pays a full February as 30 days', () => {
    const p = calculatePayslip(
      base({ period: '2026-02', settings: settings({ dayBasis: 'fixed30' }) }),
    )!;
    expect(p.payableDays).toBe(30);
    expect(line(p, 'BASIC')).toBe(6000);
  });

  it('fixed30 leaver on 10th gets 10 days', () => {
    const p = calculatePayslip(
      base({
        settings: settings({ dayBasis: 'fixed30' }),
        employee: employee({ exitDate: '2026-11-10' }),
      }),
    )!;
    expect(p.payableDays).toBe(10);
    expect(line(p, 'BASIC')).toBe(2000);
  });

  it('returns null when not employed in period', () => {
    expect(calculatePayslip(base({ employee: employee({ joinDate: '2026-12-01' }) }))).toBeNull();
  });

  it('deducts approved unpaid leave (working days only)', () => {
    const req: LeaveRequest = {
      id: 'l1',
      tenantId: 't1',
      employeeId: 'e1',
      typeCode: 'UL',
      from: '2026-11-06',
      to: '2026-11-09',
      halfDay: false,
      status: 'approved',
    };
    // 6 Nov Fri, 7 Sat, 8 Sun, 9 Mon -> 2 working days (weekend Sat/Sun)
    const p = calculatePayslip(base({ leaveRequests: [req] }))!;
    expect(p.unpaidDays).toBe(2);
    expect(line(p, 'BASIC')).toBe(5600);
  });

  it('ignores paid and pending leave', () => {
    const reqs: LeaveRequest[] = [
      {
        id: 'l1',
        tenantId: 't1',
        employeeId: 'e1',
        typeCode: 'AL',
        from: '2026-11-02',
        to: '2026-11-04',
        halfDay: false,
        status: 'approved',
      },
      {
        id: 'l2',
        tenantId: 't1',
        employeeId: 'e1',
        typeCode: 'UL',
        from: '2026-11-05',
        to: '2026-11-05',
        halfDay: false,
        status: 'pending',
      },
    ];
    expect(calculatePayslip(base({ leaveRequests: reqs }))!.unpaidDays).toBe(0);
  });

  it('overtime from BASIC rate', () => {
    const p = calculatePayslip(
      base({ input: { employeeId: 'e1', overtimeHours: 10, adjustments: [], hold: false } }),
    )!;
    // 6000 / 30 / 8 = 25/h * 1.25 * 10 = 312.5
    expect(line(p, 'OT')).toBe(312.5);
  });

  it('adjustments and reimbursements', () => {
    const p = calculatePayslip(
      base({
        input: {
          employeeId: 'e1',
          overtimeHours: 0,
          hold: false,
          adjustments: [
            {
              showNote: true,
              source: 'manual',
              code: 'BONUS',
              name: 'Bonus',
              type: 'earning',
              amount: 500,
              glAccount: 'Bonus',
            },
            {
              showNote: true,
              source: 'manual',
              code: 'PENALTY',
              name: 'Late penalty',
              type: 'deduction',
              amount: 50,
              glAccount: 'Other Income',
            },
          ],
        },
        reimbursements: [
          {
            id: 'r1',
            tenantId: 't1',
            employeeId: 'e1',
            category: 'Fuel',
            amount: 120.5,
            date: '2026-11-03',
            status: 'approved',
            payPeriod: '2026-11',
          },
          {
            id: 'r2',
            tenantId: 't1',
            employeeId: 'e1',
            category: 'Fuel',
            amount: 99,
            date: '2026-11-03',
            status: 'submitted',
            payPeriod: '2026-11',
          },
        ],
      }),
    )!;
    expect(p.gross).toBe(8500 + 500 + 120.5);
    expect(p.totalDeductions).toBe(150);
    expect(p.reimbursementIds).toEqual(['r1']);
  });

  it('recovers loan installment and caps at net-pay floor', () => {
    const loan: Loan = {
      id: 'ln1',
      tenantId: 't1',
      employeeId: 'e1',
      kind: 'loan',
      principal: 12000,
      installments: 2,
      startPeriod: '2026-11',
      status: 'active',
      recovered: 0,
      skippedPeriods: [],
    };
    const p = calculatePayslip(base({ loans: [loan] }))!;
    // gross 8500, floor 50% = 4250, room = 8500-100-4250 = 4150 < 6000 due
    expect(line(p, 'LOAN')).toBe(4150);
    expect(p.loanRecoveries[0]).toEqual({ loanId: 'ln1', amount: 4150, due: 6000 });
    expect(p.warnings.join()).toMatch(/net-pay floor/);
  });

  it('warns when bank details are missing', () => {
    const p = calculatePayslip(base({ employee: employee({ payment: { method: 'bank' } }) }))!;
    expect(p.warnings).toContain('Bank details missing');
  });

  it('picks the latest assignment effective by period end', () => {
    const a2 = {
      ...assignment,
      id: 'a2',
      effectiveFrom: '2026-11-15',
      amounts: { ...assignment.amounts, BASIC: 7000 },
    };
    const a3 = { ...assignment, id: 'a3', effectiveFrom: '2026-12-01' };
    expect(assignmentFor([assignment, a2, a3], 'e1', '2026-11')!.id).toBe('a2');
  });
});

describe('loans', () => {
  const loan: Loan = {
    id: 'ln',
    tenantId: 't1',
    employeeId: 'e1',
    kind: 'advance',
    principal: 1000,
    installments: 3,
    startPeriod: '2026-11',
    status: 'active',
    recovered: 0,
    skippedPeriods: ['2026-12'],
  };
  it('schedule sums to principal and skips periods', () => {
    const s = schedule(loan);
    expect(s.map((r) => r.period)).toEqual(['2026-11', '2027-01', '2027-02']);
    expect(s.reduce((a, r) => a + r.amount, 0)).toBeCloseTo(1000, 2);
    expect(s[2].amount).toBe(333.34);
  });
  it('catches up an under-recovered installment', () => {
    expect(dueForPeriod({ ...loan, recovered: 100 }, '2027-01')).toBe(566.66);
  });
  it('never exceeds outstanding', () => {
    expect(dueForPeriod({ ...loan, recovered: 900 }, '2027-02')).toBe(100);
  });
});

describe('leave balance', () => {
  it('accrues monthly and subtracts approved leave', () => {
    const b = leaveBalance({
      type: leaveTypes[0],
      joinDate: '2025-01-01',
      asOf: '2026-06-30',
      year: 2026,
      carriedForward: 5,
      employeeId: 'e1',
      settings: settings(),
      requests: [
        {
          id: 'x',
          tenantId: 't1',
          employeeId: 'e1',
          typeCode: 'AL',
          from: '2026-03-02',
          to: '2026-03-06',
          halfDay: false,
          status: 'approved',
        },
      ],
    });
    expect(b).toEqual({ accrued: 20, taken: 5, pending: 0, balance: 15 });
    expect(carryForward(b.balance, leaveTypes[0])).toBe(10);
  });
});

describe('run lifecycle & exports', () => {
  const officer = { id: 'u1', roles: ['payroll_officer' as const] };
  const approver = { id: 'u2', roles: ['payroll_approver' as const] };
  const accounts = { id: 'u3', roles: ['accounts' as const] };
  const p = calculatePayslip(base())!;
  const empty: PayrollRun = {
    id: 'r1',
    tenantId: 't1',
    period: '2026-11',
    currency: 'AED',
    status: 'draft',
    payslips: [],
    events: [],
  };

  it('follows maker-checker', () => {
    const calc = transition(empty, 'calculate', officer, { payslips: [p] });
    expect(calc.status).toBe('calculated');
    expect(() => transition(calc, 'approve', { id: 'u1', roles: ['payroll_approver'] })).toThrow(
      TransitionError,
    );
    const ok = transition(calc, 'approve', approver);
    expect(() => transition(ok, 'mark_paid', officer)).toThrow(/Role not allowed/);
    const paid = transition(ok, 'mark_paid', accounts, { paymentRef: 'ENBD-123' });
    expect(transition(paid, 'lock', accounts).status).toBe('locked');
    expect(() => transition(paid, 'calculate', officer)).toThrow(/Cannot calculate/);
  });

  it('reopen and cancel need a reason', () => {
    const ok = transition(
      transition(empty, 'calculate', officer, { payslips: [p] }),
      'approve',
      approver,
    );
    expect(() => transition(ok, 'reopen', approver, { reason: 'x' })).toThrow(/Reason/);
    expect(transition(ok, 'reopen', approver, { reason: 'Missed overtime for Sales' }).status).toBe(
      'calculated',
    );
  });

  it('journal balances and excludes held payslips', () => {
    const held = { ...p, employeeId: 'e2', hold: true };
    const run = { ...empty, payslips: [p, held] };
    const j = journalLines(run, settings());
    const dr = j.reduce((a, l) => a + l.debit, 0),
      cr = j.reduce((a, l) => a + l.credit, 0);
    expect(dr).toBeCloseTo(cr, 2);
    expect(dr).toBe(8500);
    expect(zohoJournalCsv(run, settings(), '2026-11-28').split('\n')[0]).toMatch(
      /^Journal Date,Reference Number/,
    );
    expect(runTotals(run)).toMatchObject({ employees: 2, onHold: 1, net: 8400 });
  });

  it('bank file skips held / non-bank employees', () => {
    const e2 = employee({ id: 'e2', code: 'EMP-002', payment: { method: 'cash' } });
    const run = { ...empty, payslips: [p, { ...p, employeeId: 'e2', employeeCode: 'EMP-002' }] };
    const { csv, skipped } = bankTransferCsv(run, [employee(), e2]);
    expect(csv.trim().split('\n')).toHaveLength(2);
    expect(skipped).toEqual([{ code: 'EMP-002', reason: 'Paid by cash' }]);
  });

  it('posting effects aggregate loan recoveries', () => {
    const loan: Loan = {
      id: 'ln1',
      tenantId: 't1',
      employeeId: 'e1',
      kind: 'loan',
      principal: 1000,
      installments: 2,
      startPeriod: '2026-11',
      status: 'active',
      recovered: 0,
      skippedPeriods: [],
    };
    const ps = calculatePayslip(base({ loans: [loan] }))!;
    expect(postingEffects({ ...empty, payslips: [ps] }).loanIncrements).toEqual([
      { loanId: 'ln1', amount: 500 },
    ]);
  });
});

describe('John decisions 27 Nov', () => {
  const officer = { id: 'u1', roles: ['payroll_officer' as const] };
  const umbreen = { id: 'umbreen', roles: ['payroll_approver' as const] };
  const john = { id: 'john', roles: ['admin' as const] };
  const p = calculatePayslip(base())!;
  const calc = transition(
    {
      id: 'r',
      tenantId: 't1',
      period: '2026-11',
      currency: 'AED',
      status: 'draft',
      payslips: [],
      events: [],
    },
    'calculate',
    officer,
    { payslips: [p] },
  );

  it('defaults: actual-days basis, Zoho salary account, pay 2nd-5th next month', () => {
    const s = settings();
    expect(s.dayBasis).toBe('calendar');
    expect(s.gl.salaryExpense).toBe('Salaries & Other Benefits');
    expect(payWindowFor('2026-12', s.payWindow)).toEqual({ from: '2027-01-02', to: '2027-01-05' });
  });

  it('either named approver is enough when requiredApprovals = 1', () => {
    const policy = { approverUserIds: ['umbreen', 'john'], requiredApprovals: 1 as const };
    expect(transition(calc, 'approve', umbreen, { policy }).status).toBe('approved');
    expect(() =>
      transition(calc, 'approve', { id: 'x', roles: ['payroll_approver'] }, { policy }),
    ).toThrow(/named payroll approver/);
  });

  it('both must approve when requiredApprovals = 2', () => {
    const policy = { approverUserIds: ['umbreen', 'john'], requiredApprovals: 2 as const };
    const one = transition(calc, 'approve', umbreen, { policy });
    expect(one.status).toBe('calculated');
    expect(() => transition(one, 'approve', umbreen, { policy })).toThrow(/already approved/);
    expect(transition(one, 'approve', john, { policy }).status).toBe('approved');
  });

  it('journal debits Salaries & Other Benefits', () => {
    const run = { ...calc, payslips: [p] };
    expect(journalLines(run, PayrollSettings.parse({ tenantId: 't1' }))[0]).toMatchObject({
      account: 'Salaries & Other Benefits',
      debit: 8500,
    });
  });
});

describe('Zoho per-employee accounts', () => {
  it("posts salary to the employee's own account; component-level accounts and adjustments keep theirs", () => {
    const st = {
      ...structure,
      components: [
        ...structure.components,
        {
          code: 'ACCOM',
          name: 'Accommodation',
          type: 'earning' as const,
          calc: { kind: 'fixed' as const },
          prorate: true,
          glAccount: 'Employee Accommodation',
          postTo: 'component' as const,
          showOnPayslip: true,
        },
      ],
    };
    const p = calculatePayslip(
      base({
        structure: st,
        assignment: { ...assignment, amounts: { ...assignment.amounts, ACCOM: 1500 } },
        employee: employee({ glExpenseAccount: 'Salary for Rohail' }),
        input: {
          employeeId: 'e1',
          overtimeHours: 8,
          hold: false,
          adjustments: [
            {
              showNote: true,
              source: 'manual',
              code: 'EOM',
              name: 'Employee of the Month',
              type: 'earning',
              amount: 300,
              glAccount: 'Employee Of the Month',
            },
          ],
        },
      }),
    )!;
    const gl = Object.fromEntries(p.lines.map((l) => [l.code, l.glAccount]));
    expect(gl).toMatchObject({
      BASIC: 'Salary for Rohail',
      HRA: 'Salary for Rohail',
      OT: 'Salary for Rohail',
      ACCOM: 'Employee Accommodation',
      EOM: 'Employee Of the Month',
      MEDINS: 'Insurance Payable',
    });
    const j = journalLines(
      {
        id: 'r',
        tenantId: 't1',
        period: '2026-11',
        currency: 'AED',
        status: 'calculated',
        payslips: [p],
        events: [],
      },
      settings(),
    );
    expect(j.find((l) => l.account === 'Salary for Rohail')!.debit).toBe(8750);
  });
  it('falls back to component account when employee has none', () => {
    expect(calculatePayslip(base())!.lines[0].glAccount).toBe('Salaries & Other Benefits');
  });
});

import {
  paymentJournalCsv,
  amountInWords,
  renderPayslipHtml,
  ytdTotals,
} from '@coex/shared/payroll/index';
describe('payslip document', () => {
  it('amount in words', () => {
    expect(amountInWords(6500, 'AED')).toBe('Six Thousand Five Hundred Dirhams Only');
    expect(amountInWords(12345.5, 'AED')).toBe(
      'Twelve Thousand Three Hundred Forty Five Dirhams and Fifty Fils Only',
    );
    expect(amountInWords(150000, 'PKR')).toBe('One Hundred Fifty Thousand Rupees Only');
  });
  const p = calculatePayslip(base())!;
  const doc = (runStatus: RunStatus) =>
    renderPayslipHtml({
      payslip: p,
      runStatus,
      runRef: 'PAY-2026-11',
      ytd: ytdTotals([p, p]),
      employee: { code: '001', name: 'A <b>', joinDate: '2024-01-01', paymentMethod: 'bank' },
      branding: {
        companyName: 'DIGISOL LLC FZ',
        addressLines: ['Dubai'],
        stampDataUrl: 'data:image/png;base64,STAMP',
      },
    });
  it('draft has watermark and no stamp; approved has stamp', () => {
    expect(doc('calculated')).toMatch(/DRAFT/);
    expect(doc('calculated')).not.toMatch(/STAMP/);
    expect(doc('approved')).toMatch(/STAMP/);
    expect(doc('approved')).not.toMatch(/class="wm"/);
  });
  it('escapes names and shows YTD', () => {
    expect(doc('paid')).toContain('A &lt;b&gt;');
    expect(doc('paid')).toContain('12,000.00'); // BASIC YTD 2 × 6000
  });
});

describe('Zoho advance and bank (27 Nov)', () => {
  it('advances post to Employee Advance; no payment journal without bank', () => {
    const s = settings();
    expect(s.gl.loanReceivable).toBe('Employee Advance');
    const run = {
      id: 'r',
      tenantId: 't1',
      period: '2026-11',
      currency: 'AED',
      status: 'paid' as const,
      payslips: [calculatePayslip(base())!],
      events: [],
    };
    expect(paymentJournalCsv(run, s, '2026-12-03')).toBeNull();
    expect(
      paymentJournalCsv(run, settings({ gl: { ...s.gl, bank: 'ENBD' } }), '2026-12-03'),
    ).toMatch(/ENBD/);
  });
});
