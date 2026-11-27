import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import { Types } from 'mongoose';
import { connectForTests, clearDatabase, disconnectFromTests } from '../setup';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { ContractModel } from '@coex/shared/crm/models/contract.model';
import { AuditLogModel } from '@coex/shared/core/models/audit-log.model';
import { PAYROLL_MODELS } from '@coex/shared/payroll/models/record.model';
import { runWithContext } from '@/lib/tenant-context';
import { permissionsFor } from '@coex/shared/core/permissions';
import { updateUserAccess } from '@/modules/core/services/user.service';
import * as payroll from '@/modules/payroll/services/payroll.service';
import { payslipPdf } from '@/modules/payroll/services/files.service';
import { PDFDocument } from 'pdf-lib';
import { payrollTemplate } from '@/modules/payroll/workbook';
import ExcelJS from 'exceljs';

const tenantId = new Types.ObjectId(),
  otherTenant = new Types.ObjectId();
const ids = {
  owner: new Types.ObjectId(),
  hr: new Types.ObjectId(),
  checker: new Types.ObjectId(),
  accounts: new Types.ObjectId(),
  employee: new Types.ObjectId(),
  tenantAdmin: new Types.ObjectId(),
};
type Actor = keyof typeof ids;
const within = <T>(actor: Actor, fn: () => T, tenant = tenantId) =>
  runWithContext({ tenantId: tenant, userId: ids[actor], isPlatformAdmin: actor === 'owner' }, fn);
let employeeId: string, structureId: string;
beforeAll(() => connectForTests('payroll'));
afterAll(disconnectFromTests);
beforeEach(async () => {
  await clearDatabase();
  await TenantModel.create([
    { _id: tenantId, name: 'DigiSol', slug: 'digisol' },
    { _id: otherTenant, name: 'Other company', slug: 'other-company', modules: { payroll: true } },
  ]);
  for (const [actor, _id] of Object.entries(ids))
    await UserModel.create({
      _id,
      tenantId,
      name: actor,
      email: `${actor}@example.test`,
      role:
        actor === 'owner' ? 'platform_admin' : actor === 'tenantAdmin' ? 'tenant_admin' : 'agent',
      status: 'active',
    });
  await within('owner', () =>
    payroll.initializePayroll({
      hrIds: [String(ids.hr)],
      approverIds: [String(ids.checker)],
      accountsIds: [String(ids.accounts)],
    }),
  );
  const structure = (await within('hr', () => payroll.listPayroll('structure')))[0];
  structureId = String(structure.id);
  employeeId = await within('hr', () =>
    payroll.savePayroll('employee', {
      code: 'E-001',
      name: 'Payroll Test Employee',
      userId: String(ids.employee),
      email: 'employee@example.test',
      joinDate: '2026-11-01',
      currency: 'AED',
      payment: { method: 'bank', iban: 'AE00TEST001', accountTitle: 'Payroll Test Employee' },
    }),
  );
  await within('hr', () =>
    payroll.savePayroll('assignment', {
      employeeId,
      structureId,
      effectiveFrom: '2026-11-01',
      package: 3000,
      reason: 'Opening salary assignment',
    }),
  );
});
const create = () => within('hr', () => payroll.createRun('2026-11', 'AED'));
async function approve(runId: string) {
  await within('hr', () => payroll.changeRun(runId, 'calculate'));
  await within('checker', () => payroll.changeRun(runId, 'approve'));
}

it('denies salary reads to ordinary staff, tenant admins, disabled tenants and forged tenant actors', async () => {
  await expect(within('employee', () => payroll.listPayroll('employee'))).rejects.toThrow('denied');
  await expect(within('tenantAdmin', () => payroll.listPayroll('employee'))).rejects.toThrow(
    'denied',
  );
  await expect(within('hr', () => payroll.listPayroll('employee'), otherTenant)).rejects.toThrow(
    'denied',
  );
  await TenantModel.updateOne({ _id: tenantId }, { $set: { 'modules.payroll': false } });
  await expect(within('owner', () => payroll.listPayroll('employee'))).rejects.toThrow(
    'not available',
  );
});
it('prevents tenant administrators granting themselves salary access', async () => {
  await expect(
    within('tenantAdmin', () =>
      updateUserAccess(String(ids.tenantAdmin), { grants: ['payroll.manage'], denials: [] }),
    ),
  ).rejects.toThrow();
  expect(permissionsFor({ role: 'tenant_admin' }).has('payroll.read.all')).toBe(false);
});
it('stores all salary amounts as explicit minor units and preserves immutable salary history', async () => {
  const row = await PAYROLL_MODELS.assignment.findOne({ tenantId, employeeId });
  expect(row?.data.packageMinorUnits).toBe(300000);
  expect(row?.data.package).toBeUndefined();
  await expect(
    within('hr', () =>
      payroll.savePayroll(
        'assignment',
        {
          id: String(row?._id),
          employeeId,
          structureId,
          effectiveFrom: '2026-11-01',
          package: 9999,
          reason: 'Overwriting history',
        },
        row?.version,
      ),
    ),
  ).rejects.toThrow('immutable');
});
it('requires a separate named approver, prevents approved edits and keeps bank snapshots stable', async () => {
  const runId = await create();
  await within('owner', () => payroll.changeRun(runId, 'calculate'));
  await expect(within('owner', () => payroll.changeRun(runId, 'approve'))).rejects.toThrow(
    'Preparer',
  );
  await within('checker', () => payroll.changeRun(runId, 'approve'));
  await expect(
    within('hr', () => payroll.saveRunInput(runId, employeeId, { employeeId, overtimeHours: 50 })),
  ).rejects.toThrow('cannot be edited');
  const employee = (await within('hr', () => payroll.listPayroll('employee')))[0];
  await within('hr', () =>
    payroll.savePayroll(
      'employee',
      { ...employee, payment: { method: 'bank', iban: 'AE00CHANGED' } },
      Number(employee.version),
    ),
  );
  const bank = await within('accounts', () => payroll.exportRun(runId, 'bank'));
  expect(bank).toContain('AE00TEST001');
  expect(bank).not.toContain('AE00CHANGED');
  await expect(within('accounts', () => payroll.exportRun(runId, 'journal'))).rejects.toThrow(
    'pending',
  );
});
it('caps loan recovery and applies paid effects exactly once under concurrent retries', async () => {
  const loanId = await within('hr', () =>
    payroll.savePayroll('loan', {
      employeeId,
      kind: 'loan',
      principal: 4000,
      installments: 1,
      startPeriod: '2026-11',
    }),
  );
  await within('hr', () => payroll.decideRequest('loan', loanId, true));
  const runId = await create();
  await approve(runId);
  await Promise.all([
    within('accounts', () => payroll.changeRun(runId, 'mark_paid', { paymentRef: 'BANK-001' })),
    within('accounts', () => payroll.changeRun(runId, 'mark_paid', { paymentRef: 'BANK-001' })),
  ]);
  const loan = await PAYROLL_MODELS.loan.findById(loanId);
  expect(loan?.data.recoveredMinorUnits).toBe(150000);
  const paid = await PAYROLL_MODELS.run.findById(runId);
  expect(paid?.status).toBe('paid');
  const run = payroll.recordData(paid!) as payroll.RunData;
  expect(run.payslips[0].net).toBe(1500);
  expect(run.events.filter((e) => e.action === 'mark_paid')).toHaveLength(1);
  await within('accounts', () => payroll.changeRun(runId, 'lock'));
  await expect(within('hr', () => payroll.changeRun(runId, 'calculate'))).rejects.toThrow('Cannot');
});
it('rolls back loan recovery and run payment if reimbursement eligibility changed', async () => {
  const loanId = await within('hr', () =>
    payroll.savePayroll('loan', {
      employeeId,
      kind: 'advance',
      principal: 1000,
      installments: 10,
      startPeriod: '2026-11',
    }),
  );
  await within('hr', () => payroll.decideRequest('loan', loanId, true));
  const expenseId = await within('employee', () =>
    payroll.savePayroll('reimbursement', {
      self: true,
      category: 'Travel',
      amount: 50,
      date: '2026-11-10',
    }),
  );
  await within('hr', () => payroll.decideRequest('reimbursement', expenseId, true, '2026-11'));
  const runId = await create();
  await approve(runId);
  await PAYROLL_MODELS.reimbursement.updateOne(
    { _id: expenseId },
    { $set: { status: 'paid', 'data.status': 'paid' } },
  );
  await expect(
    within('accounts', () => payroll.changeRun(runId, 'mark_paid', { paymentRef: 'BANK-FAIL' })),
  ).rejects.toThrow('Reimbursement');
  expect((await PAYROLL_MODELS.loan.findById(loanId))?.data.recoveredMinorUnits).toBe(0);
  expect((await PAYROLL_MODELS.run.findById(runId))?.status).toBe('approved');
});
it('projects own paid payslips only and does not expose bank snapshots, inputs or other employees', async () => {
  const runId = await create();
  await approve(runId);
  expect(await within('employee', () => payroll.listPayroll('run', true))).toEqual([]);
  await within('accounts', () => payroll.changeRun(runId, 'mark_paid', { paymentRef: 'BANK-OWN' }));
  const rows = await within('employee', () => payroll.listPayroll('run', true));
  expect(rows).toHaveLength(1);
  expect(rows[0]).not.toHaveProperty('employeeSnapshots');
  expect(rows[0]).not.toHaveProperty('inputs');
  expect(JSON.stringify(rows)).not.toContain('AE00TEST001');
  const pdf = await within('employee', () => payslipPdf(runId, employeeId, true));
  expect((await PDFDocument.load(pdf)).getPageCount()).toBe(2);
  const bank = await within('employee', () => payslipPdf(runId, employeeId, true, true));
  expect((await PDFDocument.load(bank)).getPageCount()).toBe(1);
  await expect(
    within('employee', () => payslipPdf(runId, new Types.ObjectId().toString(), true)),
  ).rejects.toThrow('not found');
});
it('prevents forged self-service employee IDs, approval status and salary identity reassignment', async () => {
  const request = await within('employee', () =>
    payroll.savePayroll('loan', {
      self: true,
      employeeId: new Types.ObjectId().toString(),
      status: 'active',
      recovered: 500,
      principal: 1000,
      installments: 5,
      startPeriod: '2026-11',
      kind: 'loan',
    }),
  );
  const row = await PAYROLL_MODELS.loan.findById(request);
  expect(row?.employeeId).toBe(employeeId);
  expect(row?.status).toBe('requested');
  expect(row?.data.recoveredMinorUnits).toBe(0);
  const employee = (await within('hr', () => payroll.listPayroll('employee')))[0];
  await expect(
    within('hr', () =>
      payroll.savePayroll(
        'employee',
        { ...employee, userId: String(ids.hr) },
        Number(employee.version),
      ),
    ),
  ).rejects.toThrow('cannot be reassigned');
});
it('invalidates approvals after edits and blocks unapproved over-limit items', async () => {
  const runId = await create();
  await within('hr', () =>
    payroll.addItem(runId, employeeId, { categoryCode: 'APPRECIATION', amount: 1200 }),
  );
  await within('hr', () => payroll.changeRun(runId, 'calculate'));
  await expect(within('checker', () => payroll.changeRun(runId, 'approve'))).rejects.toThrow(
    'need approval',
  );
  await within('checker', () => payroll.approveItem(runId, employeeId, 0));
  await approve(runId);
  const general = await AuditLogModel.find({ entityType: 'Payroll' }).lean();
  expect(JSON.stringify(general)).not.toContain('300000');
  expect(await PAYROLL_MODELS.change.countDocuments()).toBeGreaterThan(0);
});
it('applies recurring items once per month and retains per-run reasoned overrides', async () => {
  await within('hr', () =>
    payroll.savePayroll('recurringItem', {
      employeeId,
      categoryCode: 'APPRECIATION',
      amount: 100,
      startPeriod: '2026-11',
      endPeriod: '2026-12',
      active: true,
      note: 'Monthly recognition',
    }),
  );
  const runId = await create();
  await within('hr', () => payroll.changeRun(runId, 'calculate'));
  await within('hr', () => payroll.changeRun(runId, 'calculate'));
  const run = payroll.recordData((await PAYROLL_MODELS.run.findById(runId))!) as payroll.RunData;
  expect(run.payslips[0].gross).toBe(3100);
  expect(run.inputs[0].adjustments).toHaveLength(1);
  await within('hr', () =>
    payroll.addItem(runId, employeeId, {
      categoryCode: 'APPRECIATION',
      index: 0,
      amount: 150,
      overrideReason: 'Additional recognition this month',
    }),
  );
  await within('hr', () => payroll.changeRun(runId, 'calculate'));
  const changed = payroll.recordData(
    (await PAYROLL_MODELS.run.findById(runId))!,
  ) as payroll.RunData;
  expect(changed.payslips[0].gross).toBe(3150);
});
it('caps partial-payment commissions at recurring term value excluding setup, without duplicate accruals', async () => {
  const contract = await ContractModel.create({
    tenantId,
    number: 'C-TEST',
    organisationId: new Types.ObjectId(),
    title: 'Test recurring contract',
    startDate: '2026-11-01',
    endDate: '2027-10-31',
    billingFrequency: 'monthly',
    valueMinorUnits: 100000,
    setupFeeMinorUnits: 900000,
    currency: 'AED',
    status: 'active',
    salesOwnerId: ids.employee,
    commissionSignedAt: new Date('2026-11-01'),
  });
  await within('hr', () =>
    payroll.savePayroll('commissionPlan', {
      employeeId,
      userId: String(ids.employee),
      rate: 10,
      effectiveFrom: '2026-01-01',
      active: true,
    }),
  );
  await within('accounts', () =>
    payroll.recordContractPayment({
      contractId: String(contract._id),
      amount: 6000,
      currency: 'AED',
      receivedAt: '2026-11-10',
      reference: 'PART-1',
    }),
  );
  await within('accounts', () =>
    payroll.recordContractPayment({
      contractId: String(contract._id),
      amount: 9000,
      currency: 'AED',
      receivedAt: '2026-11-15',
      reference: 'PART-2',
    }),
  );
  const runId = await create();
  await within('hr', () => payroll.changeRun(runId, 'calculate'));
  await within('hr', () => payroll.changeRun(runId, 'calculate'));
  expect(await PAYROLL_MODELS.accrual.countDocuments()).toBe(2);
  const run = payroll.recordData((await PAYROLL_MODELS.run.findById(runId))!) as payroll.RunData;
  expect(run.inputs[0].adjustments[0].amount).toBe(1200);
  await within('checker', () => payroll.approveItem(runId, employeeId, 0));
  await approve(runId);
  await within('accounts', () =>
    payroll.changeRun(runId, 'mark_paid', { paymentRef: 'COMMISSION-PAID' }),
  );
  expect(await PAYROLL_MODELS.accrual.countDocuments({ status: 'paid' })).toBe(2);
  await ContractModel.updateOne(
    { _id: contract._id },
    { $set: { status: 'cancelled', cancelledAt: new Date('2026-12-02') } },
  );
  const next = await within('hr', () => payroll.createRun('2026-12', 'AED'));
  await within('hr', () =>
    payroll.confirmClawback(
      next,
      String(contract._id),
      employeeId,
      'Cancelled within the clawback window',
    ),
  );
  await within('checker', () => payroll.approveItem(next, employeeId, 0));
  await approve(next);
  await within('accounts', () =>
    payroll.changeRun(next, 'mark_paid', { paymentRef: 'CLAWBACK-PAID' }),
  );
  expect(await PAYROLL_MODELS.accrual.countDocuments({ status: 'clawed_back' })).toBe(2);
});
it('validates Excel before writes, imports atomically and is idempotent on retry', async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await payrollTemplate()) as unknown as Parameters<typeof wb.xlsx.load>[0]);
  wb.getWorksheet('Employees')!.addRow([
    'E-NEW',
    'Imported employee',
    '',
    '2026-11-01',
    'AED',
    '',
    '',
    '',
    '',
    '',
  ]);
  wb.getWorksheet('Assignments')!.addRow([
    'E-NEW',
    'Standard (package split)',
    '2026-11-01',
    2000,
    'Opening salary',
  ]);
  const bytes = Buffer.from(await wb.xlsx.writeBuffer());
  const preview = await within('hr', () => payroll.importPayroll(bytes));
  expect(preview.records).toBe(2);
  expect(await PAYROLL_MODELS.employee.countDocuments()).toBe(1);
  await within('hr', () => payroll.importPayroll(bytes, true));
  expect(await PAYROLL_MODELS.employee.countDocuments()).toBe(2);
  const repeat = await within('hr', () => payroll.importPayroll(bytes, true));
  expect(repeat.records).toBe(0);
  wb.getWorksheet('Loans')!.addRow(['bad', 'MISSING', 'loan', 100, 0, 1, '2026-11']);
  const bad = Buffer.from(await wb.xlsx.writeBuffer());
  await expect(within('hr', () => payroll.importPayroll(bad, true))).rejects.toThrow(
    'Employee code',
  );
  expect(await PAYROLL_MODELS.loan.countDocuments()).toBe(0);
});
it('requires recalculation if payroll inputs change after calculation', async () => {
  const runId = await create();
  await within('hr', () => payroll.changeRun(runId, 'calculate'));
  await within('employee', () =>
    payroll.savePayroll('reimbursement', {
      self: true,
      category: 'Travel',
      amount: 25,
      date: '2026-11-10',
    }),
  );
  await expect(within('checker', () => payroll.changeRun(runId, 'approve'))).rejects.toThrow(
    'Recalculate',
  );
  await approve(runId);
});
it('carries held commissions and approved expenses to the next eligible run', async () => {
  const contract = await ContractModel.create({
    tenantId,
    number: 'C-HOLD',
    organisationId: new Types.ObjectId(),
    title: 'Hold test',
    startDate: '2026-11-01',
    endDate: '2027-10-31',
    billingFrequency: 'monthly',
    valueMinorUnits: 100000,
    currency: 'AED',
    status: 'active',
    salesOwnerId: ids.employee,
    commissionSignedAt: new Date('2026-11-01'),
  });
  await within('hr', () =>
    payroll.savePayroll('commissionPlan', {
      employeeId,
      userId: String(ids.employee),
      rate: 10,
      effectiveFrom: '2026-01-01',
      active: true,
    }),
  );
  await within('accounts', () =>
    payroll.recordContractPayment({
      contractId: String(contract._id),
      amount: 1000,
      currency: 'AED',
      receivedAt: '2026-11-10',
      reference: 'HELD-RECEIPT',
    }),
  );
  const expense = await within('employee', () =>
    payroll.savePayroll('reimbursement', {
      self: true,
      category: 'Travel',
      amount: 50,
      date: '2026-11-10',
    }),
  );
  await within('hr', () => payroll.decideRequest('reimbursement', expense, true, '2026-11'));
  const held = await create();
  await within('hr', () => payroll.saveRunInput(held, employeeId, { employeeId, hold: true }));
  await approve(held);
  await within('accounts', () =>
    payroll.changeRun(held, 'mark_paid', { paymentRef: 'HOLD-NO-PAYMENT' }),
  );
  expect((await PAYROLL_MODELS.accrual.findOne())?.data.runId).toBeUndefined();
  expect((await PAYROLL_MODELS.reimbursement.findById(expense))?.status).toBe('approved');
  const next = await within('hr', () => payroll.createRun('2026-12', 'AED'));
  await approve(next);
  const run = payroll.recordData((await PAYROLL_MODELS.run.findById(next))!) as payroll.RunData;
  expect(run.payslips[0].net).toBe(3150);
  await within('accounts', () =>
    payroll.changeRun(next, 'mark_paid', { paymentRef: 'HELD-CATCHUP' }),
  );
  expect((await PAYROLL_MODELS.reimbursement.findById(expense))?.status).toBe('paid');
  expect(await PAYROLL_MODELS.accrual.countDocuments({ status: 'paid' })).toBe(1);
});
it('tracks actual commission paid after a zero override, so clawback cannot deduct unpaid commission', async () => {
  const contract = await ContractModel.create({
    tenantId,
    number: 'C-ZERO',
    organisationId: new Types.ObjectId(),
    title: 'Zero override',
    startDate: '2026-11-01',
    endDate: '2027-10-31',
    billingFrequency: 'monthly',
    valueMinorUnits: 100000,
    currency: 'AED',
    status: 'active',
    salesOwnerId: ids.employee,
    commissionSignedAt: new Date('2026-11-01'),
  });
  await within('hr', () =>
    payroll.savePayroll('commissionPlan', {
      employeeId,
      userId: String(ids.employee),
      rate: 10,
      effectiveFrom: '2026-01-01',
      active: true,
    }),
  );
  await within('accounts', () =>
    payroll.recordContractPayment({
      contractId: String(contract._id),
      amount: 1000,
      currency: 'AED',
      receivedAt: '2026-11-10',
      reference: 'ZERO-RECEIPT',
    }),
  );
  const runId = await create();
  await within('hr', () => payroll.changeRun(runId, 'calculate'));
  await within('hr', () =>
    payroll.addItem(runId, employeeId, {
      categoryCode: 'COMMISSION',
      index: 0,
      amount: 0,
      overrideReason: 'Commission waived after HR review',
    }),
  );
  await approve(runId);
  await within('accounts', () =>
    payroll.changeRun(runId, 'mark_paid', { paymentRef: 'ZERO-COMMISSION' }),
  );
  expect((await PAYROLL_MODELS.accrual.findOne())?.data.paidAmountMinorUnits).toBe(0);
  await ContractModel.updateOne(
    { _id: contract._id },
    { $set: { status: 'cancelled', cancelledAt: new Date('2026-12-02') } },
  );
  expect(await within('hr', () => payroll.clawbacks('2026-12'))).toEqual([]);
});
it('blocks implicit currency conversion in automatic commission and honors plan deactivation', async () => {
  const user = await UserModel.create({
    tenantId,
    name: 'PKR salesperson',
    email: 'pkr-sales@example.test',
    role: 'agent',
  });
  const pkrEmployee = await within('hr', () =>
    payroll.savePayroll('employee', {
      code: 'PKR-001',
      name: 'PKR salesperson',
      userId: String(user._id),
      joinDate: '2026-11-01',
      currency: 'PKR',
      payment: { method: 'cash' },
    }),
  );
  await within('hr', () =>
    payroll.savePayroll('assignment', {
      employeeId: pkrEmployee,
      structureId,
      effectiveFrom: '2026-11-01',
      package: 20000,
      reason: 'PKR opening salary',
    }),
  );
  const planId = await within('hr', () =>
    payroll.savePayroll('commissionPlan', {
      employeeId: pkrEmployee,
      userId: String(user._id),
      rate: 10,
      effectiveFrom: '2026-01-01',
      active: true,
    }),
  );
  const settings = (await within('owner', () => payroll.listPayroll('settings')))[0];
  await within('owner', () =>
    payroll.savePayroll(
      'settings',
      { ...settings, approvalLimits: { AED: 1000, PKR: 5000 } },
      Number(settings.version),
    ),
  );
  const contract = await ContractModel.create({
    tenantId,
    number: 'C-FX',
    organisationId: new Types.ObjectId(),
    title: 'AED sale',
    startDate: '2026-11-01',
    endDate: '2027-10-31',
    billingFrequency: 'yearly',
    valueMinorUnits: 100000,
    currency: 'AED',
    status: 'active',
    salesOwnerId: user._id,
    commissionSignedAt: new Date('2026-11-01'),
  });
  await within('accounts', () =>
    payroll.recordContractPayment({
      contractId: String(contract._id),
      amount: 1000,
      currency: 'AED',
      receivedAt: '2026-11-10',
      reference: 'FX-NO-CONVERSION',
    }),
  );
  const runId = await within('hr', () => payroll.createRun('2026-11', 'PKR'));
  await expect(within('hr', () => payroll.changeRun(runId, 'calculate'))).rejects.toThrow(
    'matching currencies',
  );
  expect(await PAYROLL_MODELS.accrual.countDocuments()).toBe(0);
  const plan = (await within('hr', () => payroll.listPayroll('commissionPlan'))).find(
    (p) => p.id === planId,
  )!;
  await within('hr', () =>
    payroll.savePayroll('commissionPlan', { ...plan, active: false }, Number(plan.version)),
  );
  await within('hr', () => payroll.changeRun(runId, 'calculate'));
  expect(await PAYROLL_MODELS.accrual.countDocuments()).toBe(0);
});
