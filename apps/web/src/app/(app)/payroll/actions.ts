'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { asUser, requireStaffUser } from '@/lib/session';
import * as Service from '@/modules/payroll/services/payroll.service';
import { uploadPayrollFile } from '@/modules/payroll/services/files.service';
import { FIELDS } from './fields';
import { DEFAULT_STRUCTURE, type RunAction } from '@coex/shared/payroll/index';
import { appBaseUrl } from '@/modules/core/services/email.service';
import type { Adjustment } from '@coex/shared/payroll/index';
import { getContext } from '@/lib/tenant-context';
export type PayrollActionState = {
  error?: string;
  message?: string;
  success?: boolean;
  goto?: string;
};
const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
export async function payrollAction(
  _previous: PayrollActionState,
  form: FormData,
): Promise<PayrollActionState> {
  try {
    const actor = await requireStaffUser();
    return await asUser(actor, async () => {
      let ref: Adjustment['ref'];
      if (text(form, 'relatedLink')) {
        const url = new URL(text(form, 'relatedLink'), appBaseUrl());
        if (url.origin !== new URL(appBaseUrl()).origin)
          throw new Error('Use a Worktello record link.');
        const parts = url.pathname.split('/').filter(Boolean);
        const type =
          parts[0] === 'contracts'
            ? 'contract'
            : parts[0] === 'opportunities'
              ? 'deal'
              : parts[0] === 'spaces'
                ? 'project'
                : parts[0] === 'support' && parts[1] === 'tickets'
                  ? 'ticket'
                  : null;
        const refId = type === 'ticket' ? parts[2] : parts[1];
        if (!type || !refId) throw new Error('Use a contract, deal, ticket or space link.');
        ref = { type, id: refId };
      }
      const intent = text(form, 'intent'),
        kind = text(form, 'recordKind'),
        runId = text(form, 'runId'),
        employeeId = text(form, 'employeeId');
      if (intent === 'initialize') {
        await Service.initializePayroll({
          hrIds: form.getAll('hrIds').map(String),
          approverIds: form.getAll('approverIds').map(String),
          accountsIds: form.getAll('accountsIds').map(String),
        });
        return { success: true, message: 'Payroll initialized for DigiSol.' };
      }
      if (intent === 'save') {
        if (!(kind in FIELDS)) throw new Error('Unsupported payroll form.');
        const data: Record<string, unknown> = {};
        for (const field of FIELDS[kind]) {
          let value: unknown;
          if (field.type === 'checkbox') value = form.get(field.key) === 'on';
          else if (field.type === 'multiple') value = form.getAll(field.key).map(String);
          else {
            const raw = text(form, field.key);
            value = raw ? (field.type === 'number' ? Number(raw) : raw) : undefined;
          }
          const keys = field.key.split('.');
          if (keys.length === 2) {
            const nested = (data[keys[0]] ?? {}) as Record<string, unknown>;
            nested[keys[1]] = value;
            data[keys[0]] = nested;
          } else data[field.key] = value;
        }
        if (text(form, 'id')) data.id = text(form, 'id');
        if (text(form, 'self')) data.self = true;
        if (kind === 'structure') {
          const base = DEFAULT_STRUCTURE(String(getContext().tenantId));
          data.components = base.components.map((component, index) =>
            index < 6
              ? {
                  ...component,
                  calc: { kind: 'package_percent', rate: Number(form.get(`percent${index}`)) },
                }
              : component,
          );
        }
        if (kind === 'category') data.glAccount = 'Pending Zoho mapping';
        if (kind === 'settings') {
          data.requiredApprovals = Number(data.requiredApprovals);
          data.weekendDays = (data.weekendDays as string[]).map(Number);
          data.holidays = String(data.holidays ?? '')
            .split(/\s+/)
            .filter(Boolean);
          data.approvalLimits = {
            AED: Number(data.approvalAED ?? 1000),
            ...(data.approvalPKR !== undefined ? { PKR: Number(data.approvalPKR) } : {}),
          };
        }
        if (kind === 'commissionPlan') {
          const employee = (await Service.listPayroll('employee')).find(
            (e) => e.id === data.employeeId,
          );
          data.userId = employee?.userId;
        }
        await Service.savePayroll(
          kind as Parameters<typeof Service.savePayroll>[0],
          data,
          text(form, 'version') ? Number(form.get('version')) : undefined,
        );
      } else if (intent === 'createRun') {
        const id = await Service.createRun(text(form, 'period'), text(form, 'currency'));
        return { success: true, goto: `/payroll/runs/${id}` };
      } else if (intent === 'transition') {
        await Service.changeRun(
          runId,
          z
            .enum(['calculate', 'approve', 'reopen', 'mark_paid', 'lock', 'cancel'])
            .parse(text(form, 'action')) as RunAction,
          { reason: text(form, 'reason'), paymentRef: text(form, 'paymentRef') },
        );
      } else if (intent === 'input') {
        await Service.saveRunInput(runId, employeeId, {
          employeeId,
          overtimeHours: Number(form.get('overtimeHours') ?? 0),
          unpaidDaysOverride: text(form, 'unpaidDaysOverride')
            ? Number(form.get('unpaidDaysOverride'))
            : undefined,
          hold: form.get('hold') === 'on',
        });
      } else if (intent === 'item') {
        await Service.addItem(runId, employeeId, {
          ref,
          categoryCode: text(form, 'categoryCode'),
          amount: text(form, 'amount') ? Number(form.get('amount')) : undefined,
          note: text(form, 'note'),
          index: text(form, 'index') ? Number(form.get('index')) : undefined,
          value: text(form, 'value') ? Number(form.get('value')) : undefined,
          rate: text(form, 'rate') ? Number(form.get('rate')) : undefined,
          qty: text(form, 'qty') ? Number(form.get('qty')) : undefined,
          unitRate: text(form, 'unitRate') ? Number(form.get('unitRate')) : undefined,
          componentCode: text(form, 'componentCode') || undefined,
          overrideReason: text(form, 'overrideReason') || undefined,
        });
      } else if (intent === 'removeItem')
        await Service.removeRunItem(runId, employeeId, Number(form.get('index')));
      else if (intent === 'skipLoan')
        await Service.skipLoanInstallment(
          text(form, 'id'),
          text(form, 'period'),
          text(form, 'reason'),
        );
      else if (intent === 'approveItem')
        await Service.approveItem(runId, employeeId, Number(form.get('index')));
      else if (intent === 'decide')
        await Service.decideRequest(
          z.enum(['leave', 'loan', 'reimbursement']).parse(kind),
          text(form, 'id'),
          text(form, 'approve') === 'yes',
          text(form, 'payPeriod'),
        );
      else if (intent === 'payment')
        await Service.recordContractPayment({
          contractId: text(form, 'contractId'),
          amount: Number(form.get('amount')),
          currency: text(form, 'currency'),
          receivedAt: text(form, 'receivedAt'),
          reference: text(form, 'reference'),
        });
      else if (intent === 'contract')
        await Service.setCommissionContract({
          contractId: text(form, 'contractId'),
          salesOwnerId: text(form, 'salesOwnerId'),
          commissionRate: text(form, 'commissionRate')
            ? Number(form.get('commissionRate'))
            : undefined,
          cancelledAt: text(form, 'cancelledAt') || undefined,
          commissionSignedAt: text(form, 'commissionSignedAt') || undefined,
        });
      else if (intent === 'clawback')
        await Service.confirmClawback(
          runId,
          text(form, 'contractId'),
          employeeId,
          text(form, 'reason'),
        );
      else if (intent === 'upload') {
        const file = form.get('attachment');
        if (!(file instanceof File) || file.size > 3 * 1024 * 1024)
          throw new Error('Choose a file, at most 3 MB.');
        await uploadPayrollFile(
          text(form, 'recordId'),
          z.enum(['run', 'reimbursement']).parse(kind),
          { name: file.name, type: file.type, body: Buffer.from(await file.arrayBuffer()) },
        );
      } else if (intent === 'import') {
        const file = form.get('workbook');
        if (!(file instanceof File) || file.size > 2 * 1024 * 1024)
          throw new Error('Choose an .xlsx workbook, at most 2 MB.');
        const result = await Service.importPayroll(
          Buffer.from(await file.arrayBuffer()),
          form.get('apply') === 'on',
        );
        return {
          success: result.applied,
          message: `${result.applied ? 'Imported' : 'Preview'}: ${result.records} new records. ${result.errors.length ? result.errors.join('\n') : 'No validation errors.'}`,
        };
      } else throw new Error('Unsupported payroll action.');
      revalidatePath('/payroll', 'layout');
      revalidatePath('/payroll');
      return { success: true, message: 'Saved.' };
    });
  } catch (error) {
    return {
      error:
        error instanceof z.ZodError
          ? error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
          : error instanceof Error
            ? error.message
            : 'Payroll action failed.',
    };
  }
}
