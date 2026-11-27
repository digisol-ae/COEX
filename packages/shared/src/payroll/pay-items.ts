// Pay-items catalogue (additions & deductions) and the default salary structure.
// Admin edits the catalogue; only HR adds items to a run; items over the
// approval limit need Umbreen or John (either) before the run can be approved.
import { z } from 'zod';
import { PayrollError } from './engine';
import { Adjustment, SalaryStructure, type PayrollSettings } from './schemas';

export const PayItemCategory = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9_]{1,29}$/),
  name: z.string(),
  type: z.enum(['earning', 'deduction']),
  calc: z
    .enum(['fixed', 'percent_of_value', 'qty_x_rate', 'percent_of_component'])
    .default('fixed'),
  glAccount: z.string(),
  showNoteOnPayslip: z.boolean().default(true),
  alwaysNeedsApproval: z.boolean().default(false),
  reasonRequired: z.boolean().default(false),
  monthlyCap: z.number().positive().optional(),
  auto: z.boolean().default(false), // created by the system (commission, EOTM, bonus); HR can override
  active: z.boolean().default(true),
});
export type PayItemCategory = z.infer<typeof PayItemCategory>;

const G = 'Salaries & Other Benefits';
export const DEFAULT_CATEGORIES: PayItemCategory[] = [
  {
    code: 'COMMISSION',
    name: 'Commission',
    type: 'earning',
    calc: 'percent_of_value',
    glAccount: G,
    auto: true,
  },
  {
    code: 'PROJECT_SHARE',
    name: 'Project share',
    type: 'earning',
    calc: 'percent_of_value',
    glAccount: G,
  },
  {
    code: 'APPRECIATION',
    name: 'Token of appreciation',
    type: 'earning',
    calc: 'fixed',
    glAccount: 'Employee Other Benifits',
  },
  {
    code: 'EOTM',
    name: 'Employee of the Month',
    type: 'earning',
    calc: 'fixed',
    glAccount: 'Employee Of the Month',
    auto: true,
  },
  {
    code: 'ANNUAL_BONUS',
    name: 'Annual bonus',
    type: 'earning',
    calc: 'fixed',
    glAccount: G,
    auto: true,
  },
  {
    code: 'ARREARS',
    name: 'Arrears',
    type: 'earning',
    calc: 'fixed',
    glAccount: G,
    reasonRequired: true,
  },
  {
    code: 'EXPENSE_SETTLEMENT',
    name: 'Settlement of expenses',
    type: 'earning',
    calc: 'fixed',
    glAccount: G,
  },
  {
    code: 'OTHER_ADD',
    name: 'Other addition',
    type: 'earning',
    calc: 'fixed',
    glAccount: G,
    reasonRequired: true,
  },
  {
    code: 'UNPUNCTUAL',
    name: 'Unpunctual',
    type: 'deduction',
    calc: 'fixed',
    glAccount: G,
    showNoteOnPayslip: false,
    reasonRequired: true,
  },
  {
    code: 'BEHAVIOUR',
    name: 'Behaviour',
    type: 'deduction',
    calc: 'fixed',
    glAccount: G,
    showNoteOnPayslip: false,
    reasonRequired: true,
  },
  {
    code: 'ADVANCE_MANUAL',
    name: 'Advance recovery (manual)',
    type: 'deduction',
    calc: 'fixed',
    glAccount: 'Employee Advance',
  },
  {
    code: 'CLAWBACK',
    name: 'Commission clawback',
    type: 'deduction',
    calc: 'fixed',
    glAccount: G,
    auto: true,
    reasonRequired: true,
  },
  {
    code: 'OTHER_DED',
    name: 'Other deduction',
    type: 'deduction',
    calc: 'fixed',
    glAccount: G,
    reasonRequired: true,
  },
].map((c) => PayItemCategory.parse(c));

/**
 * Default package split (common UAE/GCC practice: basic about 60% because
 * end-of-service benefits are usually based on basic). HR can change all %.
 */
export const DEFAULT_STRUCTURE = (tenantId: string): SalaryStructure =>
  SalaryStructure.parse({
    id: 'default',
    tenantId,
    name: 'Standard (package split)',
    status: 'published',
    components: [
      {
        code: 'BASIC',
        name: 'Basic Salary',
        type: 'earning',
        calc: { kind: 'package_percent', rate: 60 },
        glAccount: G,
      },
      {
        code: 'ACCOM',
        name: 'Accommodation Allowance',
        type: 'earning',
        calc: { kind: 'package_percent', rate: 25 },
        glAccount: 'Employee Accommodation',
        postTo: 'component',
      },
      {
        code: 'TRANS',
        name: 'Transport Allowance',
        type: 'earning',
        calc: { kind: 'package_percent', rate: 7 },
        glAccount: G,
      },
      {
        code: 'FOOD',
        name: 'Food Allowance',
        type: 'earning',
        calc: { kind: 'package_percent', rate: 3 },
        glAccount: G,
      },
      {
        code: 'MEDICAL',
        name: 'Medical Allowance',
        type: 'earning',
        calc: { kind: 'package_percent', rate: 2 },
        glAccount: G,
      },
      {
        code: 'INTERNET',
        name: 'Internet Allowance',
        type: 'earning',
        calc: { kind: 'package_percent', rate: 1 },
        glAccount: G,
      },
      {
        code: 'OTHER',
        name: 'Other Allowance',
        type: 'earning',
        calc: { kind: 'balance' },
        glAccount: G,
      },
    ],
  });

/** Structure checks shown in the structure editor. */
export function validateStructure(st: SalaryStructure): string[] {
  const errs: string[] = [];
  const pct = st.components.reduce(
    (a, c) => a + (c.calc.kind === 'package_percent' ? c.calc.rate : 0),
    0,
  );
  const bal = st.components.filter((c) => c.calc.kind === 'balance');
  if (pct > 100) errs.push(`Percentages add up to ${pct}% (max 100%)`);
  if (pct > 0 && bal.length !== 1)
    errs.push('Mark exactly one component as Balance (e.g. Other allowance)');
  const codes = st.components.map((c) => c.code);
  if (new Set(codes).size !== codes.length) errs.push('Component codes must be unique');
  return errs;
}

export type Actor = { id: string; roles: string[] };

/** HR adds an item to an employee in a run. Returns the stored item (approval flag set). */
export function addRunItem(opts: {
  category: PayItemCategory;
  actor: Actor;
  settings: PayrollSettings;
  amount?: number;
  value?: number;
  rate?: number;
  qty?: number;
  unitRate?: number;
  note?: string;
  ref?: Adjustment['ref'];
  glOverride?: string;
  monthToDateForCategory?: number;
  /** For auto items being overridden */
  autoAmount?: number;
  overrideReason?: string;
}): Adjustment {
  const { category: c, actor, settings: s } = opts;
  if (!actor.roles.some((r) => r === 'hr' || r === 'admin'))
    throw new PayrollError('Only HR can add payroll items');
  if (!c.active) throw new PayrollError(`${c.name} is inactive`);
  let amount: number | undefined = opts.amount;
  if (amount === undefined) {
    if (c.calc === 'percent_of_value' && opts.value !== undefined && opts.rate !== undefined)
      amount = (opts.value * opts.rate) / 100;
    else if (c.calc === 'qty_x_rate' && opts.qty !== undefined && opts.unitRate !== undefined)
      amount = opts.qty * opts.unitRate;
  }
  if (
    amount === undefined ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    (amount === 0 && opts.autoAmount === undefined)
  )
    throw new PayrollError('Amount must be greater than zero');
  amount = Math.round(amount * 100) / 100;
  if ((c.reasonRequired || c.code.startsWith('OTHER')) && !opts.note?.trim())
    throw new PayrollError(`A reason is required for ${c.name}`);
  if (c.monthlyCap && (opts.monthToDateForCategory ?? 0) + amount > c.monthlyCap)
    throw new PayrollError(`${c.name} exceeds the monthly cap of ${c.monthlyCap}`);
  let override: Adjustment['override'];
  if (opts.autoAmount !== undefined && Math.abs(opts.autoAmount - amount) > 0.004) {
    if (!opts.overrideReason || opts.overrideReason.trim().length < 5)
      throw new PayrollError('Reason required to override a calculated amount');
    override = { originalAmount: opts.autoAmount, reason: opts.overrideReason, by: actor.id };
  }
  const required = c.alwaysNeedsApproval || amount > s.itemApprovalLimit;
  return Adjustment.parse({
    code: c.code,
    name: c.name,
    type: c.type,
    amount,
    glAccount: opts.glOverride ?? c.glAccount,
    note: opts.note,
    showNote: c.showNoteOnPayslip,
    ref: opts.ref,
    source: opts.autoAmount !== undefined ? 'auto' : 'manual',
    override,
    approval: { required },
    addedBy: actor.id,
  });
}

/** Umbreen or John (any user in approverUserIds) approves an over-limit item. */
export function approveRunItem(
  item: Adjustment,
  approverId: string,
  s: PayrollSettings,
  now = new Date().toISOString(),
): Adjustment {
  if (!item.approval?.required) return item;
  if (s.approverUserIds.length && !s.approverUserIds.includes(approverId))
    throw new PayrollError('You are not a named payroll approver');
  if (item.addedBy === approverId && s.approverUserIds.length > 1)
    throw new PayrollError('Another approver must approve an item you added');
  return { ...item, approval: { required: true, approvedBy: approverId, approvedAt: now } };
}
