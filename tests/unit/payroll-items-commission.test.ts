import { describe, expect, it } from 'vitest';
import {
  accrueCommissions,
  addRunItem,
  approveRunItem,
  calculatePayslip,
  clawbackSuggestions,
  commissionRunItems,
  DEFAULT_CATEGORIES,
  DEFAULT_STRUCTURE,
  resolveComponents,
  transition,
  validateStructure,
  type CommissionAccrual,
  type ContractForCommission,
} from '@coex/shared/payroll/index';
import { employee, leaveTypes, settings } from './payroll-fixtures';

const cat = (c: string) => DEFAULT_CATEGORIES.find((x) => x.code === c)!;
const hr = { id: 'hr1', roles: ['hr'] };
const s = settings({ approverUserIds: ['umbreen', 'john'] });

describe('package split', () => {
  const st = DEFAULT_STRUCTURE('t1');
  it('default is valid and other allowance takes the balance exactly', () => {
    expect(validateStructure(st)).toEqual([]);
    const m = resolveComponents(st.components, {}, 6543.21);
    const total = [...m.values()].reduce((a, b) => a + b, 0);
    expect(total).toBe(654321);
    expect(m.get('BASIC')).toBe(392593);
  });
  it('rejects >100% and missing package', () => {
    const bad = {
      ...st,
      components: st.components.map((c) =>
        c.code === 'BASIC' ? { ...c, calc: { kind: 'package_percent' as const, rate: 80 } } : c,
      ),
    };
    expect(validateStructure(bad)[0]).toMatch(/118%/);
    expect(() => resolveComponents(st.components, {})).toThrow(/package is required/);
  });
  it('payslip prorates the split', () => {
    const p = calculatePayslip({
      settings: s,
      period: '2026-11',
      employee: employee({ joinDate: '2026-11-16' }),
      structure: { ...st, id: 'default' },
      assignment: {
        id: 'a',
        tenantId: 't1',
        employeeId: 'e1',
        structureId: 'default',
        effectiveFrom: '2026-01-01',
        package: 6000,
        amounts: {},
      },
      leaveTypes,
      leaveRequests: [],
      loans: [],
      reimbursements: [],
    })!;
    expect(p.gross).toBe(3000);
  });
});

describe('run items', () => {
  it('only HR can add; reason rules; approval over AED 1,000', () => {
    expect(() =>
      addRunItem({
        category: cat('APPRECIATION'),
        actor: { id: 'm', roles: ['payroll_officer'] },
        settings: s,
        amount: 100,
      }),
    ).toThrow(/Only HR/);
    expect(() =>
      addRunItem({ category: cat('UNPUNCTUAL'), actor: hr, settings: s, amount: 50 }),
    ).toThrow(/reason/);
    const small = addRunItem({
      category: cat('APPRECIATION'),
      actor: hr,
      settings: s,
      amount: 1000,
    });
    expect(small.approval?.required).toBe(false);
    const big = addRunItem({
      category: cat('PROJECT_SHARE'),
      actor: hr,
      settings: s,
      value: 30000,
      rate: 5,
      note: 'R4 rollout',
      ref: { type: 'project', id: 'p1' },
    });
    expect(big).toMatchObject({ amount: 1500, approval: { required: true } });
    expect(() => approveRunItem(big, 'hr1', s)).toThrow(/not a named/);
    expect(approveRunItem(big, 'umbreen', s).approval?.approvedBy).toBe('umbreen');
  });
  it('behaviour deductions hide the note on the payslip by default', () => {
    const it1 = addRunItem({
      category: cat('BEHAVIOUR'),
      actor: hr,
      settings: s,
      amount: 100,
      note: 'Customer complaint 12 Nov',
    });
    expect(it1.showNote).toBe(false);
  });
  it('override of auto amount needs a reason and is recorded', () => {
    expect(() =>
      addRunItem({
        category: cat('COMMISSION'),
        actor: hr,
        settings: s,
        amount: 400,
        autoAmount: 500,
      }),
    ).toThrow(/override/);
    const o = addRunItem({
      category: cat('COMMISSION'),
      actor: hr,
      settings: s,
      amount: 400,
      autoAmount: 500,
      overrideReason: 'Discount given',
    });
    expect(o.override).toEqual({ originalAmount: 500, reason: 'Discount given', by: 'hr1' });
  });
  it('unapproved item blocks run approval', () => {
    const big = addRunItem({
      category: cat('ARREARS'),
      actor: hr,
      settings: s,
      amount: 2000,
      note: 'Oct increment',
    });
    const ctx = {
      settings: s,
      period: '2026-11',
      employee: employee(),
      structure: { ...DEFAULT_STRUCTURE('t1') },
      assignment: {
        id: 'a',
        tenantId: 't1',
        employeeId: 'e1',
        structureId: 'default',
        effectiveFrom: '2026-01-01',
        package: 6000,
        amounts: {},
      },
      leaveTypes,
      leaveRequests: [],
      loans: [],
      reimbursements: [],
    };
    const p = calculatePayslip({
      ...ctx,
      input: { employeeId: 'e1', overtimeHours: 0, hold: false, adjustments: [big] },
    })!;
    expect(p.pendingApprovals).toBe(1);
    const run = transition(
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
      { id: 'o', roles: ['payroll_officer'] },
      { payslips: [p] },
    );
    expect(() =>
      transition(run, 'approve', { id: 'umbreen', roles: ['payroll_approver'] }),
    ).toThrow(/need approval/);
  });
});

describe('commission', () => {
  const contracts: ContractForCommission[] = [
    {
      id: 'c1',
      number: 'C-18',
      customer: 'Dome Med',
      value: 20000,
      ownerUserId: 'ashif',
      signedAt: '2026-10-01T00:00:00Z',
      status: 'active',
      isRenewal: false,
    },
    {
      id: 'c2',
      number: 'C-19',
      customer: 'Renewal Co',
      value: 10000,
      ownerUserId: 'ashif',
      signedAt: '2026-10-01T00:00:00Z',
      status: 'active',
      isRenewal: true,
    },
    {
      id: 'c3',
      number: 'C-20',
      customer: 'Renew Rate',
      value: 10000,
      ownerUserId: 'ashif',
      signedAt: '2026-10-01T00:00:00Z',
      status: 'active',
      isRenewal: true,
      commissionRate: 2,
    },
  ];
  const plans = [
    { employeeId: 'e-ashif', userId: 'ashif', rate: 5, effectiveFrom: '2026-01-01', active: true },
  ];
  let n = 0;
  const newId = () => `acc${++n}`;
  const pays = [
    { id: 'p1', contractId: 'c1', amount: 8000, receivedAt: '2026-11-05T10:00:00Z' },
    { id: 'p2', contractId: 'c1', amount: 2000, receivedAt: '2026-11-20T10:00:00Z' },
    { id: 'p3', contractId: 'c2', amount: 10000, receivedAt: '2026-11-06T10:00:00Z' },
    { id: 'p4', contractId: 'c3', amount: 10000, receivedAt: '2026-11-06T10:00:00Z' },
    { id: 'p5', contractId: 'c1', amount: 5000, receivedAt: '2026-12-02T10:00:00Z' },
  ];
  const acc = accrueCommissions({
    period: '2026-11',
    contracts,
    payments: pays,
    plans,
    existing: [],
    newId,
  });
  it('proportional to each payment; renewal only with manual rate', () => {
    expect(acc.map((a) => [a.paymentId, a.amount])).toEqual([
      ['p1', 400],
      ['p2', 100],
      ['p4', 200],
    ]);
  });
  it('idempotent and capped at rate × contract value', () => {
    expect(
      accrueCommissions({
        period: '2026-11',
        contracts,
        payments: pays,
        plans,
        existing: acc,
        newId,
      }),
    ).toEqual([]);
    const over = accrueCommissions({
      period: '2026-12',
      contracts,
      payments: [
        ...pays,
        { id: 'p6', contractId: 'c1', amount: 9000, receivedAt: '2026-12-03T00:00:00Z' },
      ],
      plans,
      existing: acc,
      newId,
    });
    expect(over.reduce((a, x) => a + x.amount, 0)).toBe(500); // cap 1,000 − 500 already
  });
  it('creates one run item per contract', () => {
    const items = commissionRunItems(acc, contracts, s, 'e-ashif');
    expect(items.map((i) => [i.ref?.label, i.amount, i.source])).toEqual([
      ['C-18', 500, 'auto'],
      ['C-20', 200, 'auto'],
    ]);
  });
  it('clawback within 90 days only', () => {
    const paid: CommissionAccrual[] = acc.map((a) => ({ ...a, status: 'paid' }));
    const cancelled = contracts.map((c) =>
      c.id === 'c1'
        ? { ...c, status: 'cancelled' as const, cancelledAt: '2026-12-10T00:00:00Z' }
        : c,
    );
    const sug = clawbackSuggestions({
      period: '2026-12',
      contracts: cancelled,
      accruals: paid,
      settings: s,
    });
    expect(sug).toHaveLength(1);
    expect(sug[0].item).toMatchObject({ code: 'CLAWBACK', type: 'deduction', amount: 500 });
    const late = cancelled.map((c) =>
      c.id === 'c1' ? { ...c, cancelledAt: '2027-02-10T00:00:00Z' } : c,
    );
    expect(
      clawbackSuggestions({ period: '2027-02', contracts: late, accruals: paid, settings: s }),
    ).toEqual([]);
    expect(
      clawbackSuggestions({
        period: '2027-02',
        contracts: late,
        accruals: paid,
        settings: settings({ clawbackDays: 180 }),
      }),
    ).toHaveLength(1);
  });
});
