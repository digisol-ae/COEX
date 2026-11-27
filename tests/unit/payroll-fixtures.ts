import {
  PayrollSettings,
  type Employee,
  type SalaryAssignment,
  type SalaryStructure,
  type LeaveType,
} from '@coex/shared/payroll/index';

export const settings = (over: Partial<PayrollSettings> = {}): PayrollSettings =>
  PayrollSettings.parse({ tenantId: 't1', ...over });

export const structure: SalaryStructure = {
  id: 'ss1',
  tenantId: 't1',
  name: 'Standard',
  status: 'published',
  components: [
    {
      code: 'BASIC',
      name: 'Basic',
      type: 'earning',
      calc: { kind: 'fixed' },
      prorate: true,
      glAccount: 'Salaries & Other Benefits',
      postTo: 'employee',
      showOnPayslip: true,
    },
    {
      code: 'HRA',
      name: 'Housing',
      type: 'earning',
      calc: { kind: 'percent', of: 'BASIC', rate: 25 },
      prorate: true,
      glAccount: 'Salaries & Other Benefits',
      postTo: 'employee',
      showOnPayslip: true,
    },
    {
      code: 'TRANS',
      name: 'Transport',
      type: 'earning',
      calc: { kind: 'fixed' },
      prorate: true,
      glAccount: 'Salaries & Other Benefits',
      postTo: 'employee',
      showOnPayslip: true,
    },
    {
      code: 'MEDINS',
      name: 'Medical insurance share',
      type: 'deduction',
      calc: { kind: 'fixed' },
      prorate: false,
      glAccount: 'Insurance Payable',
      postTo: 'component',
      showOnPayslip: true,
    },
  ],
};

export const employee = (over: Partial<Employee> = {}): Employee => ({
  id: 'e1',
  tenantId: 't1',
  code: 'EMP-001',
  name: 'Test Employee',
  joinDate: '2025-01-01',
  status: 'active',
  currency: 'AED',
  payment: { method: 'bank', iban: 'AE070331234567890123456', bankName: 'ENBD' },
  ...over,
});

export const assignment: SalaryAssignment = {
  id: 'a1',
  tenantId: 't1',
  employeeId: 'e1',
  structureId: 'ss1',
  effectiveFrom: '2025-01-01',
  amounts: { BASIC: 6000, TRANS: 1000, MEDINS: 100 },
};

export const leaveTypes: LeaveType[] = [
  {
    code: 'AL',
    name: 'Annual',
    paid: true,
    annualEntitlement: 30,
    accrual: 'monthly',
    carryForwardMax: 10,
  },
  {
    code: 'UL',
    name: 'Unpaid',
    paid: false,
    annualEntitlement: 0,
    accrual: 'yearly',
    carryForwardMax: 0,
  },
];
