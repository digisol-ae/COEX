import { toMinor, mulRatio } from '@coex/shared/payroll/money';
import { it, expect } from 'vitest';
import { encodeMoney, decodeMoney } from '@coex/shared/payroll/persistence';
import { effectiveModules, modulePermissions } from '@coex/shared/core/modules';
import { permissionsFor } from '@coex/shared/core/permissions';
import { PayrollSettings, IsoDate } from '@coex/shared/payroll/schemas';
import {
  payrollTemplate,
  readPayrollWorkbook,
  checkWorkbookSize,
} from '@/modules/payroll/workbook';
import ExcelJS from 'exceljs';
it('round-trips storage money without modifying days, percentages, currency or references', () => {
  const data = {
    currency: 'AED',
    package: 1234.56,
    amounts: { BASIC: 12.34 },
    approvalLimits: { AED: 1000, PKR: 50000 },
    yearToDate: { employee: { BASIC: 1234.56 } },
    lines: [{ amount: 1.25 }],
    loanRecoveries: [{ amount: 10, due: 15 }],
    rate: 12.5,
    days: 30,
  };
  const stored = encodeMoney(data);
  expect(stored).toMatchObject({
    packageMinorUnits: 123456,
    approvalLimitsMinorUnits: { AED: 100000 },
    yearToDateMinorUnits: { employee: { BASIC: 123456 } },
    rate: 12.5,
    days: 30,
  });
  expect(decodeMoney(stored)).toEqual(data);
  expect(() => encodeMoney({ amount: Infinity })).toThrow();
  expect(() => encodeMoney({ package: Number.MAX_SAFE_INTEGER })).toThrow();
});
it('defaults payroll off and respects both entitlement layers and explicit denials', () => {
  expect(effectiveModules({}).payroll).toBe(false);
  expect(effectiveModules({ modules: { payroll: true } }).payroll).toBe(true);
  expect(
    effectiveModules({
      modules: { payroll: true },
      commercial: { planSnapshot: { modules: { payroll: false } } },
    }).payroll,
  ).toBe(false);
  const staff = permissionsFor({
    role: 'agent',
    permissionGrants: ['payroll.manage'],
    permissionDenials: ['payroll.read.all'],
  });
  expect(staff.has('payroll.read.all')).toBe(false);
  expect(modulePermissions(staff, effectiveModules({}))).not.toContain('payroll.manage');
  expect(permissionsFor({ role: 'client_contact' }).has('payroll.read.own')).toBe(false);
});
it('parses nested Zod 4 defaults and rejects impossible calendar dates', () => {
  const settings = PayrollSettings.parse({ tenantId: 'tenant' });
  expect(settings.gl.loanReceivable).toBe('Employee Advance');
  expect(settings.payWindow).toEqual({ fromDay: 2, toDay: 5 });
  expect(() => IsoDate.parse('2026-02-30')).toThrow();
});
it('creates a native Excel template and rejects formulas before import', async () => {
  const template = await payrollTemplate();
  expect((await readPayrollWorkbook(template)).Employees).toEqual([]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(template as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  workbook.getWorksheet('Employees')!.addRow([{ formula: '1+1' }]);
  await expect(readPayrollWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()))).rejects.toThrow(
    'formulas',
  );
  expect(() => checkWorkbookSize(Buffer.alloc(2 * 1024 * 1024 + 1))).toThrow('2 MB');
  expect(() => checkWorkbookSize(Buffer.from('not an xlsx'))).toThrow();
});
it('preserves text bank identifiers and rejects numeric account cells that can lose digits', async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    (await payrollTemplate()) as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );
  const sheet = workbook.getWorksheet('Employees')!;
  sheet.addRow([
    'E-001',
    'Test employee',
    '',
    '2026-11-01',
    'AED',
    '',
    '',
    'QA Bank',
    '',
    '0000123456789',
  ]);
  const parsed = await readPayrollWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()));
  expect(parsed.Employees[0]['Account number']).toBe('0000123456789');
  sheet.getRow(2).getCell(10).value = 123456789;
  await expect(readPayrollWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()))).rejects.toThrow(
    'as text',
  );
});

it('rounds decimal half-cents away from zero and refuses unsafe arithmetic', () => {
  expect(toMinor(1.005)).toBe(101);
  expect(toMinor(-1.005)).toBe(-101);
  expect(mulRatio(100, 1.005)).toBe(101);
  expect(mulRatio(4_000_000_000_000_000, 1)).toBe(4_000_000_000_000_000);
  expect(mulRatio(-100, 1.005)).toBe(-101);
  expect(() => toMinor(Number.MAX_SAFE_INTEGER)).toThrow();
});
