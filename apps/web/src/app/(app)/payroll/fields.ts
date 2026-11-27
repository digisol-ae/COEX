export type Choice = { value: string; label: string };
export type PayrollField = {
  key: string;
  label: string;
  type?:
    | 'number'
    | 'date'
    | 'month'
    | 'email'
    | 'checkbox'
    | 'select'
    | 'textarea'
    | 'multiple'
    | 'file';
  required?: boolean;
  options?: Choice[];
  value?: string | number | boolean | string[];
  step?: string;
  accept?: string;
};
const choices = (...values: string[]) => values.map((value) => ({ value, label: value }));
export const FIELDS: Record<string, PayrollField[]> = {
  recurringItem: [
    { key: 'employeeId', label: 'Employee', type: 'select', required: true },
    { key: 'categoryCode', label: 'Pay item category', type: 'select', required: true },
    { key: 'amount', label: 'Monthly amount', type: 'number', required: true },
    { key: 'startPeriod', label: 'Start month', type: 'month', required: true },
    { key: 'endPeriod', label: 'End month (optional)', type: 'month' },
    { key: 'note', label: 'Reason / note', type: 'textarea' },
    { key: 'active', label: 'Active', type: 'checkbox', value: true },
  ],
  employee: [
    { key: 'code', label: 'Employee code', required: true },
    { key: 'name', label: 'Full name', required: true },
    { key: 'userId', label: 'Linked Worktello staff', type: 'select' },
    { key: 'email', label: 'Payslip email', type: 'email' },
    { key: 'department', label: 'Department' },
    { key: 'designation', label: 'Designation' },
    { key: 'joinDate', label: 'Joining date', type: 'date', required: true },
    { key: 'exitDate', label: 'Exit date', type: 'date' },
    {
      key: 'currency',
      label: 'Currency',
      type: 'select',
      options: choices('AED', 'PKR'),
      required: true,
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: choices('active', 'on_hold', 'exited'),
    },
    {
      key: 'payment.method',
      label: 'Payment method',
      type: 'select',
      options: choices('bank', 'cash', 'cheque'),
    },
    { key: 'payment.bankName', label: 'Bank name' },
    { key: 'payment.accountTitle', label: 'Account title' },
    { key: 'payment.iban', label: 'IBAN' },
    { key: 'payment.accountNo', label: 'Account number' },
  ],
  assignment: [
    { key: 'employeeId', label: 'Employee', type: 'select', required: true },
    { key: 'structureId', label: 'Salary structure', type: 'select', required: true },
    { key: 'effectiveFrom', label: 'Effective from', type: 'date', required: true },
    { key: 'package', label: 'Monthly package', type: 'number', required: true },
    { key: 'reason', label: 'Reason for this salary assignment', required: true },
  ],
  structure: [
    { key: 'name', label: 'Structure name', required: true },
    { key: 'status', label: 'Status', type: 'select', options: choices('draft', 'published') },
    ...['Basic', 'Accommodation', 'Transport', 'Food', 'Medical', 'Internet'].map((name, i) => ({
      key: `percent${i}`,
      label: `${name} (%)`,
      type: 'number' as const,
      value: [60, 25, 7, 3, 2, 1][i],
    })),
  ],
  leaveType: [
    { key: 'code', label: 'Leave code', required: true },
    { key: 'name', label: 'Leave name', required: true },
    { key: 'paid', label: 'Paid leave', type: 'checkbox' },
    { key: 'annualEntitlement', label: 'Annual entitlement (days)', type: 'number', value: 0 },
    { key: 'accrual', label: 'Accrual', type: 'select', options: choices('monthly', 'yearly') },
    { key: 'carryForwardMax', label: 'Carry-forward cap (days)', type: 'number', value: 0 },
  ],
  leave: [
    { key: 'employeeId', label: 'Employee', type: 'select', required: true },
    { key: 'typeCode', label: 'Leave type', type: 'select', required: true },
    { key: 'from', label: 'From', type: 'date', required: true },
    { key: 'to', label: 'To', type: 'date', required: true },
    { key: 'halfDay', label: 'Half day', type: 'checkbox' },
    { key: 'reason', label: 'Reason', type: 'textarea' },
  ],
  loan: [
    { key: 'employeeId', label: 'Employee', type: 'select', required: true },
    { key: 'kind', label: 'Request', type: 'select', options: choices('loan', 'advance') },
    { key: 'principal', label: 'Amount', type: 'number', required: true },
    { key: 'installments', label: 'Monthly installments', type: 'number', value: 1, step: '1' },
    { key: 'startPeriod', label: 'First recovery month', type: 'month', required: true },
  ],
  reimbursement: [
    { key: 'employeeId', label: 'Employee', type: 'select', required: true },
    { key: 'category', label: 'Expense category', required: true },
    { key: 'amount', label: 'Amount', type: 'number', required: true },
    { key: 'date', label: 'Expense date', type: 'date', required: true },
  ],
  category: [
    { key: 'code', label: 'Category code', required: true },
    { key: 'name', label: 'Category name', required: true },
    { key: 'type', label: 'Type', type: 'select', options: choices('earning', 'deduction') },
    {
      key: 'calc',
      label: 'Calculation',
      type: 'select',
      options: choices('fixed', 'percent_of_value', 'qty_x_rate', 'percent_of_component'),
    },
    { key: 'monthlyCap', label: 'Monthly cap (optional)', type: 'number' },
    { key: 'showNoteOnPayslip', label: 'Show note on payslip', type: 'checkbox', value: true },
    { key: 'reasonRequired', label: 'Require a reason', type: 'checkbox' },
    { key: 'alwaysNeedsApproval', label: 'Always require approval', type: 'checkbox' },
    { key: 'active', label: 'Active', type: 'checkbox', value: true },
  ],
  commissionPlan: [
    { key: 'employeeId', label: 'Sales employee', type: 'select', required: true },
    { key: 'rate', label: 'Commission rate (%)', type: 'number', required: true },
    { key: 'effectiveFrom', label: 'Effective from', type: 'date', required: true },
    { key: 'active', label: 'Active', type: 'checkbox', value: true },
  ],
  settings: [
    { key: 'approverUserIds', label: 'Named approvers', type: 'multiple', required: true },
    {
      key: 'requiredApprovals',
      label: 'Required approvals',
      type: 'select',
      options: choices('1', '2'),
    },
    { key: 'approvalAED', label: 'AED item approval threshold', type: 'number', value: 1000 },
    {
      key: 'approvalPKR',
      label: 'PKR item approval threshold (configure before PKR payroll)',
      type: 'number',
    },
    { key: 'hoursPerDay', label: 'Hours per working day', type: 'number', value: 8 },
    { key: 'overtimeMultiplier', label: 'Overtime multiplier', type: 'number', value: 1.25 },
    {
      key: 'minNetPctOfGross',
      label: 'Minimum net salary after loan recovery (%)',
      type: 'number',
      value: 50,
    },
    { key: 'clawbackDays', label: 'Commission clawback window (days)', type: 'number', value: 90 },
    {
      key: 'weekendDays',
      label: 'Weekend days',
      type: 'multiple',
      options: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(
        (label, i) => ({ label, value: String(i) }),
      ),
      value: ['0', '6'],
    },
    { key: 'holidays', label: 'Holidays (one YYYY-MM-DD date per line)', type: 'textarea' },
    {
      key: 'emailPayslipsOnPaid',
      label: 'Email payslip link when paid',
      type: 'checkbox',
      value: true,
    },
  ],
};
export const ITEM_FIELDS: PayrollField[] = [
  { key: 'amount', label: 'Amount (or use a calculation below)', type: 'number' },
  { key: 'value', label: 'Value for percentage calculation', type: 'number' },
  { key: 'rate', label: 'Percentage rate (%)', type: 'number' },
  { key: 'qty', label: 'Quantity', type: 'number' },
  { key: 'unitRate', label: 'Rate per unit', type: 'number' },
  {
    key: 'componentCode',
    label: 'Salary component for percentage',
    type: 'select',
    options: ['BASIC', 'ACCOM', 'TRANS', 'FOOD', 'MEDICAL', 'INTERNET', 'OTHER'].map((value) => ({
      value,
      label: value,
    })),
  },
  { key: 'note', label: 'Note / reason', type: 'textarea' },
  {
    key: 'relatedLink',
    label: 'Related Worktello contract, deal, ticket or space link (optional)',
  },
  { key: 'overrideReason', label: 'Reason for changing an automatic amount', type: 'textarea' },
];
