// Zod schemas for the Payroll module. Every stored document carries tenantId
// and must be read/written through the tenant-scoped repository.
import { z } from 'zod';

export const Period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM');
export const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((value) => {
    const date = new Date(value + 'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Enter a valid calendar date');
export const Currency = z.string().length(3).toUpperCase();

// ---------- Settings (per tenant) ----------
export const PayrollSettings = z.object({
  tenantId: z.string(),
  baseCurrency: Currency.default('AED'),
  /** calendar = actual days in month; fixed30 = always 30; working = Mon-Fri minus holidays */
  dayBasis: z.enum(['calendar', 'fixed30', 'working']).default('calendar'),
  weekendDays: z.array(z.number().int().min(0).max(6)).default([0, 6]), // 0=Sun
  hoursPerDay: z.number().positive().default(8),
  overtimeMultiplier: z.number().positive().default(1.25),
  /** Component code used as the base for overtime and unpaid-leave rate */
  rateBaseComponent: z.string().default('BASIC'),
  /** Loan/advance recovery may not take net pay below this % of gross */
  minNetPctOfGross: z.number().min(0).max(100).default(50),
  holidays: z.array(IsoDate).default([]),
  /** Salaries are paid between these days of the FOLLOWING month (John, 27 Nov: 2nd to 5th) */
  payWindow: z
    .object({
      fromDay: z.number().int().min(1).max(28).default(2),
      toDay: z.number().int().min(1).max(28).default(5),
    })
    .prefault({}),
  /** Payslips are emailed when the run is marked paid */
  emailPayslipsOnPaid: z.boolean().default(true),
  /** Users selected in settings to approve payroll runs */
  approverUserIds: z.array(z.string()).default([]),
  /** 1 = either approver is enough; 2 = both must approve */
  requiredApprovals: z.union([z.literal(1), z.literal(2)]).default(1),
  /** Additions/deductions above this amount need an approver (John 27 Nov: AED 1,000) */
  itemApprovalLimit: z.number().min(0).default(1000),
  /** Commission clawback window in days after signing (John 27 Nov: 90, editable) */
  clawbackDays: z.number().int().min(0).default(90),
  gl: z
    .object({
      /** Default expense account for all salary components (Zoho Books) */
      salaryExpense: z.string().default('Salaries & Other Benefits'),
      salaryPayable: z.string().default('Salaries Payable'),
      loanReceivable: z.string().default('Employee Advance'),
      reimbursementExpense: z.string().default('Reimbursements'),
      /** No bank account mapped (John, 27 Nov): payment is recorded in Zoho directly; no payment journal */
      bank: z.string().optional(),
    })
    .prefault({}),
});
export type PayrollSettings = z.infer<typeof PayrollSettings>;

// ---------- Salary components & structures ----------
export const ComponentCalc = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('fixed') }), // amount comes from the employee assignment
  z.object({ kind: z.literal('percent'), of: z.string(), rate: z.number() }), // rate in %, of = component code
  z.object({ kind: z.literal('package_percent'), rate: z.number().min(0).max(100) }), // % of the employee's monthly package
  z.object({ kind: z.literal('balance') }), // package minus all other earnings (e.g. Other allowance)
]);

export const SalaryComponent = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9_]{1,19}$/),
  name: z.string().min(1),
  type: z.enum(['earning', 'deduction']),
  calc: ComponentCalc,
  prorate: z.boolean().default(true), // scale by payable days
  glAccount: z.string().min(1), // Zoho Books account name
  /** employee = debit the employee's own Zoho account (e.g. "Salary for Rohail") when set;
   *  component = always use glAccount (e.g. "Employee Accommodation") */
  postTo: z.enum(['employee', 'component']).default('employee'),
  showOnPayslip: z.boolean().default(true),
});
export type SalaryComponent = z.infer<typeof SalaryComponent>;

export const SalaryStructure = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string().min(1),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  components: z.array(SalaryComponent).min(1),
});
export type SalaryStructure = z.infer<typeof SalaryStructure>;

// ---------- Employees ----------
export const Employee = z.object({
  id: z.string(),
  tenantId: z.string(),
  code: z.string().min(1), // e.g. EMP-001
  userId: z.string().optional(), // link to Worktello user for self-service
  name: z.string().min(1),
  email: z.string().email().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  joinDate: IsoDate,
  exitDate: IsoDate.optional(),
  status: z.enum(['active', 'on_hold', 'exited']).default('active'),
  currency: Currency,
  payment: z.object({
    method: z.enum(['bank', 'cash', 'cheque']).default('bank'),
    bankName: z.string().optional(),
    accountTitle: z.string().optional(),
    iban: z.string().optional(),
    accountNo: z.string().optional(),
  }),
  costCenter: z.string().optional(),
  /** Zoho Books expense account for this employee's salary, e.g. "Salary for Rohail"
   *  (sub-account of "Salaries & Other Benefits"). Falls back to the component account. */
  glExpenseAccount: z.string().optional(),
});
export type Employee = z.infer<typeof Employee>;

/** Salary assignment: amounts for fixed components; history kept by effectiveFrom. */
export const SalaryAssignment = z.object({
  id: z.string(),
  tenantId: z.string(),
  employeeId: z.string(),
  structureId: z.string(),
  effectiveFrom: IsoDate,
  /** Agreed monthly salary; required when the structure uses package_percent / balance */
  package: z.number().min(0).optional(),
  amounts: z.record(z.string(), z.number().min(0)).prefault({}), // fixed components: code -> monthly amount
  reason: z.string().optional(), // e.g. "Annual increment 2027"
});
export type SalaryAssignment = z.infer<typeof SalaryAssignment>;

// ---------- Leave ----------
export const LeaveType = z.object({
  code: z.string(),
  name: z.string(),
  paid: z.boolean(),
  annualEntitlement: z.number().min(0), // days per year
  accrual: z.enum(['monthly', 'yearly']).default('monthly'),
  carryForwardMax: z.number().min(0).default(0),
});
export type LeaveType = z.infer<typeof LeaveType>;

export const LeaveRequest = z.object({
  id: z.string(),
  tenantId: z.string(),
  employeeId: z.string(),
  typeCode: z.string(),
  from: IsoDate,
  to: IsoDate,
  halfDay: z.boolean().default(false),
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']),
  reason: z.string().optional(),
  approverId: z.string().optional(),
});
export type LeaveRequest = z.infer<typeof LeaveRequest>;

// ---------- Loans / advances ----------
export const Loan = z.object({
  id: z.string(),
  tenantId: z.string(),
  employeeId: z.string(),
  kind: z.enum(['loan', 'advance']),
  principal: z.number().positive(),
  installments: z.number().int().min(1).max(120),
  startPeriod: Period,
  status: z.enum(['requested', 'approved', 'active', 'closed', 'rejected']),
  recovered: z.number().min(0).default(0),
  /** Periods skipped on request (installment moves to the end) */
  skippedPeriods: z.array(Period).default([]),
});
export type Loan = z.infer<typeof Loan>;

// ---------- Reimbursements ----------
export const Reimbursement = z.object({
  id: z.string(),
  tenantId: z.string(),
  employeeId: z.string(),
  category: z.string(),
  amount: z.number().positive(),
  date: IsoDate,
  status: z.enum(['submitted', 'approved', 'rejected', 'paid']),
  receiptUrl: z.string().optional(),
  payPeriod: Period.optional(), // set when approved for a run
});
export type Reimbursement = z.infer<typeof Reimbursement>;

// ---------- Per-run inputs & adjustments ----------
/** A run item (addition or deduction) chosen from the pay-items catalogue. */
export const Adjustment = z.object({
  code: z.string(), // category code, e.g. COMMISSION, PROJECT_SHARE, UNPUNCTUAL
  name: z.string(),
  type: z.enum(['earning', 'deduction']),
  amount: z.number().nonnegative(),
  glAccount: z.string(),
  note: z.string().optional(),
  showNote: z.boolean().default(true), // false = payslip shows category name only
  ref: z
    .object({
      type: z.enum(['project', 'contract', 'deal', 'ticket', 'payment', 'award', 'recurring']),
      id: z.string(),
      label: z.string().optional(),
    })
    .optional(),
  source: z.enum(['manual', 'auto']).default('manual'),
  /** When HR overrides an auto-calculated amount */
  override: z
    .object({ originalAmount: z.number(), reason: z.string().min(5), by: z.string() })
    .optional(),
  approval: z
    .object({
      required: z.boolean(),
      approvedBy: z.string().optional(),
      approvedAt: z.string().optional(),
    })
    .optional(),
  addedBy: z.string().optional(),
});
export type Adjustment = z.infer<typeof Adjustment>;

export const RunInput = z.object({
  employeeId: z.string(),
  overtimeHours: z.number().min(0).default(0),
  /** Manual override of unpaid days (otherwise derived from approved unpaid leave) */
  unpaidDaysOverride: z.number().min(0).optional(),
  adjustments: z.array(Adjustment).default([]),
  hold: z.boolean().default(false), // calculate but do not pay
});
export type RunInput = z.infer<typeof RunInput>;

export const RunStatus = z.enum(['draft', 'calculated', 'approved', 'paid', 'locked', 'cancelled']);
export type RunStatus = z.infer<typeof RunStatus>;
