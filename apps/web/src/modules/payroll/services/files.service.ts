import { amountInWords } from '@coex/shared/payroll/payslip-html';
import { Types } from 'mongoose';
import { z } from 'zod';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { fileStorage } from '@/lib/storage';
import { getContext } from '@/lib/tenant-context';
import { connectToDatabase } from '@/lib/db';
import { permissionsFor } from '@coex/shared/core/permissions';
import { payrollRepo, recordData, requirePayroll, type RunData } from './payroll.service';
import { recordAudit } from '@/modules/core/services/audit.service';

export async function uploadPayrollFile(
  recordId: string,
  kind: 'reimbursement' | 'run',
  file: { name: string; type: string; body: Buffer },
) {
  const user = await requirePayroll('payroll.read.own');
  const manage = permissionsFor(user).has('payroll.manage');
  const record = await payrollRepo(kind).findById(
    z
      .string()
      .regex(/^[a-f\d]{24}$/i)
      .parse(recordId),
  );
  if (!record || !['submitted', 'draft', 'calculated'].includes(record.status))
    throw new Error('Editable payroll record not found.');
  if (!manage) {
    if (kind !== 'reimbursement') throw new Error('Payroll access denied.');
    const employee = await payrollRepo('employee').findOne({ userId: String(getContext().userId) });
    if (!employee || record.employeeId !== String(employee._id))
      throw new Error('Payroll access denied.');
  }
  if (
    !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.body.length > 3 * 1024 * 1024
  )
    throw new Error('Use a PDF, PNG, JPEG or WebP file, at most 3 MB.');
  const saved = await fileStorage().put({
    tenantId: String(getContext().tenantId),
    fileName: file.name,
    contentType: file.type,
    body: file.body,
  });
  try {
    const db = await connectToDatabase();
    return await db.connection.transaction(async (session) => {
      const current = await payrollRepo(kind).updateOne(
        {
          _id: record._id,
          version: record.version,
          status: { $in: ['submitted', 'draft', 'calculated'] },
        },
        { $inc: { version: 1 } },
        { session },
      );
      if (!current) throw new Error('Record changed during upload.');
      const row = await payrollRepo('attachment').create(
        {
          key: new Types.ObjectId().toString(),
          employeeId: record.employeeId,
          status: 'active',
          data: {
            recordId: String(record._id),
            kind,
            fileName: file.name.replace(/[\r\n"\\/]/g, '_').slice(0, 150),
            contentType: file.type,
            storageKey: saved.key,
            bytes: saved.bytes,
          },
        },
        { session },
      );
      await recordAudit(
        { action: 'payroll.attachment_added', entityType: 'Payroll', entityId: row._id },
        session,
      );
      return String(row._id);
    });
  } catch (error) {
    await fileStorage().remove(saved.key);
    throw error;
  }
}
export async function payrollAttachments(recordId: string, own = false) {
  await requirePayroll(own ? 'payroll.read.own' : 'payroll.read.all');
  const rows = await payrollRepo('attachment').find({ 'data.recordId': recordId });
  if (own) {
    const employee = await payrollRepo('employee').findOne({ userId: String(getContext().userId) });
    if (!employee) return [];
    return rows
      .filter((row) => row.employeeId === String(employee._id))
      .map((row) => ({ id: String(row._id), name: String(row.data.fileName) }));
  }
  return rows.map((row) => ({ id: String(row._id), name: String(row.data.fileName) }));
}
export async function getPayrollFile(attachmentId: string) {
  const user = await requirePayroll('payroll.read.own');
  const row = await payrollRepo('attachment').findById(attachmentId);
  if (!row) throw new Error('File not found.');
  if (!permissionsFor(user).has('payroll.read.all')) {
    const employee = await payrollRepo('employee').findOne({ userId: String(getContext().userId) });
    if (!employee || row.employeeId !== String(employee._id)) throw new Error('File not found.');
  }
  return {
    body: await fileStorage().get(String(row.data.storageKey)),
    name: String(row.data.fileName),
  };
}
export async function payslipPdf(runId: string, employeeId: string, own = false, bank = false) {
  await requirePayroll(own ? 'payroll.read.own' : 'payroll.read.all');
  const row = await payrollRepo('run').findById(runId);
  if (!row) throw new Error('Payslip not found.');
  const run = recordData(row) as RunData;
  if (own) {
    const employee = await payrollRepo('employee').findOne({ userId: String(getContext().userId) });
    if (
      !employee ||
      String(employee._id) !== employeeId ||
      !['paid', 'locked'].includes(run.status)
    )
      throw new Error('Payslip not found.');
  }
  const slip = run.payslips.find((p) => p.employeeId === employeeId && (!own || !p.hold));
  if (!slip) throw new Error('Payslip not found.');
  const employee = run.employeeSnapshots?.find((e) => e.id === employeeId);
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica),
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const clean = (value: unknown) =>
    String(value ?? '')
      .replace(/[^\x20-\x7e]/g, ' ')
      .slice(0, 180);
  let page = pdf.addPage([595, 842]),
    y = 790;
  const line = (left: string, right = '', strong = false) => {
    if (y < 65) {
      page = pdf.addPage([595, 842]);
      y = 790;
    }
    page.drawText(clean(left), {
      x: 45,
      y,
      size: 11,
      font: strong ? bold : normal,
      color: rgb(0.12, 0.17, 0.23),
    });
    if (right) page.drawText(clean(right), { x: 365, y, size: 11, font: normal });
    y -= 23;
  };
  line('DigiSol - Payslip', `${slip.period} / ${slip.currency}`, true);
  line(slip.employeeName, slip.employeeCode, true);
  line(employee?.designation ?? '', employee?.department ?? '');
  line('Payable days', String(slip.payableDays));
  line('Payment method', employee?.payment.method ?? '');
  const account = employee?.payment.iban || employee?.payment.accountNo;
  if (account) line('Account ending', account.slice(-4));
  line('Earnings and deductions', 'Amount', true);
  for (const item of slip.lines)
    line(
      `${item.type === 'deduction' ? '- ' : ''}${item.name}`,
      `${item.amount.toFixed(2)} / YTD ${(run.yearToDate?.[employeeId]?.[item.code] ?? item.amount).toFixed(2)}`,
    );
  line('Gross', slip.gross.toFixed(2), true);
  line('Deductions', slip.totalDeductions.toFixed(2));
  line('Net pay', `${slip.currency} ${slip.net.toFixed(2)}`, true);
  line(amountInWords(slip.net, slip.currency));
  line('Run status', run.status);
  if (run.paymentRef) line('Payment reference', run.paymentRef);
  line('Reference', `${run.period}/${slip.employeeCode}`);
  // Provisional output only. Owner reviews final design, stamp/signature and content LAST.
  page.drawText('DRAFT LAYOUT - FINAL DESIGN REVIEW PENDING', {
    x: 45,
    y: 28,
    size: 9,
    font: normal,
    color: rgb(0.4, 0.4, 0.4),
  });
  if (!bank) {
    page = pdf.addPage([595, 842]);
    y = 790;
    line('Month at a glance', slip.period, true);
    const summary = run.summaries?.[employeeId];
    if (summary) {
      line('Task hours', String(summary.time.taskHours));
      line('Ticket hours', String(summary.time.ticketHours));
      line('Days with logged time', String(summary.time.daysWithTime));
      line('Tasks closed', String(summary.tasks.closed));
      line('Tickets closed', String(summary.tickets.closed));
      for (const taken of summary.leave.taken) line(`Leave: ${taken.name}`, `${taken.days} days`);
      for (const balance of summary.leave.balances)
        line(`Balance: ${balance.name}`, `${balance.balance} days`);
    } else line('No month-summary snapshot available.');
  }
  return Buffer.from(await pdf.save());
}
