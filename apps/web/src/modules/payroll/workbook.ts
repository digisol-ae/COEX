import { inflateRawSync } from 'node:zlib';
import ExcelJS from 'exceljs';
export const IMPORT_COLUMNS = {
  Employees: [
    'Employee code',
    'Name',
    'Worktello email',
    'Join date',
    'Currency',
    'Department',
    'Designation',
    'Bank name',
    'IBAN',
    'Account number',
  ],
  Assignments: ['Employee code', 'Structure name', 'Effective from', 'Monthly package', 'Reason'],
  'Leave balances': ['Employee code', 'Leave code', 'Year', 'Opening days'],
  Loans: [
    'Reference',
    'Employee code',
    'Kind',
    'Principal',
    'Recovered',
    'Installments',
    'Start period',
  ],
} as const;
export type ImportSheet = keyof typeof IMPORT_COLUMNS;
export type WorkbookRows = Record<ImportSheet, Record<string, string | number>[]>;
export async function payrollTemplate() {
  const workbook = new ExcelJS.Workbook();
  for (const [name, columns] of Object.entries(IMPORT_COLUMNS)) {
    const sheet = workbook.addWorksheet(name);
    sheet.addRow(columns);
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF35435E' } };
    sheet.columns = columns.map((key) => ({ key, width: 24, numFmt: '@' }));
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
/** Bound ZIP expansion BEFORE ExcelJS opens a user-supplied workbook. No macros/formulas. */
export function checkWorkbookSize(buffer: Buffer) {
  if (buffer.length > 2 * 1024 * 1024) throw new Error('Workbook must be 2 MB or smaller.');
  let total = 0,
    entries = 0;
  for (let i = 0; i + 46 <= buffer.length; i++) {
    if (buffer.readUInt32LE(i) !== 0x02014b50) continue;
    const size = buffer.readUInt32LE(i + 24),
      name = buffer.readUInt16LE(i + 28),
      extra = buffer.readUInt16LE(i + 30),
      comment = buffer.readUInt16LE(i + 32);
    if (size === 0xffffffff || size > 5 * 1024 * 1024 || ++entries > 100)
      throw new Error('Workbook is too large or complex.');
    const compressed = buffer.readUInt32LE(i + 20),
      local = buffer.readUInt32LE(i + 42),
      method = buffer.readUInt16LE(i + 10);
    if (
      buffer.readUInt16LE(i + 8) & 1 ||
      local + 30 > buffer.length ||
      buffer.readUInt32LE(local) !== 0x04034b50
    )
      throw new Error('Unsupported workbook ZIP entry.');
    const offset = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    if (offset + compressed > buffer.length) throw new Error('Truncated workbook.');
    const bytes = buffer.subarray(offset, offset + compressed);
    const expanded =
      method === 0
        ? bytes
        : method === 8
          ? inflateRawSync(bytes, { maxOutputLength: 5 * 1024 * 1024 })
          : null;
    if (!expanded || expanded.length !== size)
      throw new Error('Invalid or oversized workbook entry.');
    total += expanded.length;
    if (total > 20 * 1024 * 1024) throw new Error('Workbook expands beyond the 20 MB limit.');
    const filename = buffer.subarray(i + 46, i + 46 + name).toString();
    if (/vbaProject|externalLinks/i.test(filename))
      throw new Error('Use a workbook without macros or external links.');
    i += 45 + name + extra + comment;
  }
  if (!entries) throw new Error('Choose an .xlsx workbook.');
}
export async function readPayrollWorkbook(buffer: Buffer): Promise<WorkbookRows> {
  checkWorkbookSize(buffer);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const result = {} as WorkbookRows;
  let total = 0;
  for (const [name, columns] of Object.entries(IMPORT_COLUMNS)) {
    const sheet = workbook.getWorksheet(name);
    if (!sheet) throw new Error(`Missing sheet: ${name}`);
    if (sheet.rowCount > 501 || sheet.columnCount > 30)
      throw new Error('Maximum 500 rows per sheet and 30 columns.');
    if (columns.some((column, index) => sheet.getRow(1).getCell(index + 1).text !== column))
      throw new Error(`Use the supplied column headers on ${name}.`);
    const rows: Record<string, string | number>[] = [];
    sheet.eachRow((row, index) => {
      if (index === 1) return;
      const data: Record<string, string | number> = {};
      columns.forEach((column, col) => {
        const value = row.getCell(col + 1).value;
        if (value === null || value === undefined) {
          data[column] = '';
          return;
        }
        if (value instanceof Date) {
          data[column] = value.toISOString().slice(0, 10);
          return;
        }
        if (
          typeof value === 'number' &&
          ['Employee code', 'IBAN', 'Account number', 'Reference', 'Worktello email'].includes(
            column,
          )
        )
          throw new Error(
            `${name}, row ${index}: store ${column} as text to preserve every digit.`,
          );
        if (typeof value !== 'string' && typeof value !== 'number')
          throw new Error(
            `${name}, row ${index}: formulas, links and rich text are not supported.`,
          );
        if (String(value).length > 500) throw new Error(`${name}, row ${index}: cell is too long.`);
        data[column] = typeof value === 'string' ? value.trim() : value;
      });
      if (Object.values(data).some((value) => value !== '')) {
        if (++total > 1000) throw new Error('Maximum 1,000 rows in a workbook.');
        rows.push(data);
      }
    });
    result[name as ImportSheet] = rows;
  }
  return result;
}
