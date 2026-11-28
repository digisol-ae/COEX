import { z } from 'zod';
import {
  Employee,
  SalaryStructure,
  SalaryAssignment,
  LeaveType,
  LeaveRequest,
  Loan,
  Reimbursement,
  PayrollSettings,
  Period,
  IsoDate,
  Currency,
} from './schemas';
import { PayItemCategory } from './pay-items';
const id = z.string().regex(/^[a-f\d]{24}$/i);
export const Settings = PayrollSettings.extend({
  approvalLimits: z.record(z.string(), z.number().nonnegative()).default({ AED: 1000 }),
  zohoMappingStatus: z.literal('pending').default('pending'),
  leaveOpening: z
    .array(
      z.object({
        employeeId: id,
        typeCode: z.string(),
        days: z.number().nonnegative(),
        year: z.number().int(),
      }),
    )
    .default([]),
});
export const CommissionPlanSchema = z.object({
  id,
  tenantId: id,
  employeeId: id,
  userId: id,
  rate: z.number().min(0).max(100),
  effectiveFrom: IsoDate,
  active: z.boolean().default(true),
});
export const PaymentSchema = z.object({
  id,
  tenantId: id,
  contractId: id,
  amount: z.number().positive(),
  currency: Currency,
  receivedAt: IsoDate,
  reference: z.string().trim().min(1).max(120),
});
export const AccrualSchema = z.object({
  id,
  tenantId: id,
  contractId: id,
  paymentId: id,
  userId: id,
  employeeId: id,
  period: Period,
  rate: z.number().min(0).max(100),
  amount: z.number().positive(),
  status: z.enum(['pending', 'paid', 'clawed_back']),
  runId: z.string().optional(),
});
export const RecurringItem = z.object({
  id,
  tenantId: id,
  employeeId: id,
  categoryCode: z.string().min(1),
  amount: z.number().positive(),
  startPeriod: Period,
  endPeriod: Period.optional(),
  note: z.string().optional(),
  active: z.boolean().default(true),
  createdBy: id,
});
export const SCHEMAS = {
  recurringItem: RecurringItem,
  settings: Settings,
  employee: Employee,
  structure: SalaryStructure,
  assignment: SalaryAssignment,
  leaveType: LeaveType,
  leave: LeaveRequest,
  loan: Loan,
  reimbursement: Reimbursement,
  category: PayItemCategory,
  commissionPlan: CommissionPlanSchema,
  payment: PaymentSchema,
  accrual: AccrualSchema,
};
export const RunRecord = z
  .object({
    id,
    tenantId: id,
    period: Period,
    currency: Currency,
    status: z.enum(['draft', 'calculated', 'approved', 'paid', 'locked', 'cancelled']),
    payslips: z.array(z.unknown()),
    events: z.array(z.unknown()),
  })
  .passthrough();
