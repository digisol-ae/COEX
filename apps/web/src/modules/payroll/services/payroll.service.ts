import { readPayrollWorkbook } from '../workbook';
import { billingSchedule } from '@coex/shared/crm/contract-status';
import { TimeEntryModel } from '@coex/shared/time/models/time-entry.model';
import { TaskModel } from '@coex/shared/tasks/models/task.model';
import { TicketModel } from '@coex/shared/tickets/models/ticket.model';
import { queueEmail, appBaseUrl } from '@/modules/core/services/email.service';
import { Types, type ClientSession } from 'mongoose';
import { z } from 'zod';
import { PAYROLL_MODELS, type RecordKind } from '@coex/shared/payroll/models/record.model';
import { encodeMoney, decodeMoney } from '@coex/shared/payroll/persistence';
import { SCHEMAS, Settings, PaymentSchema } from '@coex/shared/payroll/records';
import * as Engine from '@coex/shared/payroll/index';
import { permissionsFor, type Permission } from '@coex/shared/core/permissions';
import { UserModel } from '@coex/shared/core/models/user.model';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { AgreementSignatureModel } from '@coex/shared/crm/models/agreement-signature.model';
import { OpportunityModel } from '@coex/shared/crm/models/opportunity.model';
import { SpaceModel } from '@coex/shared/tasks/models/space.model';
import { ContractModel } from '@coex/shared/crm/models/contract.model';
import { repository } from '@/lib/repository';
import { getContext } from '@/lib/tenant-context';
import { connectToDatabase } from '@/lib/db';
import { assertModuleAccess } from '@/modules/core/services/module-access.service';
import { requirePlatformAdministrator } from '@/modules/core/services/platform-access.service';
import { recordAudit } from '@/modules/core/services/audit.service';

export const payrollRepo = (kind: RecordKind) => repository(PAYROLL_MODELS[kind]);
const id = z.string().regex(/^[a-f\d]{24}$/i);
const contextIds = () => ({
  tenantId: String(getContext().tenantId),
  actorId: String(getContext().userId),
});
export async function requirePayroll(permission: Permission) {
  await connectToDatabase();
  await assertModuleAccess('payroll');
  const user = await repository(UserModel).findById(getContext().userId);
  if (
    !user ||
    user.status !== 'active' ||
    user.role === 'client_contact' ||
    user.mustChangePassword ||
    !permissionsFor(user).has(permission)
  )
    throw new Error('Payroll access denied.');
  return user;
}
export function recordData(row: { data: Record<string, unknown> }): Record<string, unknown> {
  return decodeMoney(row.data) as Record<string, unknown>;
}
async function settings(session?: ClientSession) {
  const row = await payrollRepo('settings').findOne({ key: 'settings' }, { session });
  if (!row) throw new Error('Payroll setup is incomplete. Ask the platform owner.');
  return { ...Settings.parse(recordData(row)), mutationRevision: row.mutexRevision };
}
async function atomic<T>(work: (session: ClientSession) => Promise<T>): Promise<T> {
  const db = await connectToDatabase();
  return db.connection.transaction(async (session) => {
    const lock = await payrollRepo('settings').updateOne(
      { key: 'settings' },
      { $inc: { mutexRevision: 1 } },
      { session },
    );
    if (!lock) throw new Error('Payroll setup is incomplete.');
    return work(session);
  });
}
async function audit(action: string, entityId: Types.ObjectId, session: ClientSession) {
  // Salary/bank details must not leak through the general audit.read permission.
  await recordAudit({ action: `payroll.${action}`, entityType: 'Payroll', entityId }, session);
}
async function write(
  kind: RecordKind,
  data: Record<string, unknown>,
  key: string,
  session: ClientSession,
  version?: number,
) {
  const docId = id.parse(data.id ?? new Types.ObjectId().toString());
  const payload: Record<string, unknown> & { id: string; tenantId: string } = {
    ...data,
    id: docId,
    tenantId: contextIds().tenantId,
  };
  const fields = {
    key,
    employeeId: typeof payload.employeeId === 'string' ? payload.employeeId : null,
    userId: typeof payload.userId === 'string' ? payload.userId : null,
    status: String(payload.status ?? 'active'),
    period: typeof payload.period === 'string' ? payload.period : null,
    currency: typeof payload.currency === 'string' ? payload.currency : null,
    data: encodeMoney(payload) as Record<string, unknown>,
  };
  if (version !== undefined) {
    const prior = await payrollRepo(kind).findById(docId, { session });
    const updated = await payrollRepo(kind).updateOne(
      { _id: docId, version },
      { $set: fields, $inc: { version: 1 } },
      { session },
    );
    if (!updated) throw new Error('This record changed. Reload and try again.');
    await payrollRepo('change').create(
      {
        key: new Types.ObjectId().toString(),
        employeeId: updated.employeeId,
        status: 'active',
        data: {
          actorId: contextIds().actorId,
          kind,
          recordId: docId,
          before: prior?.data ?? null,
          after: fields.data,
          at: new Date().toISOString(),
        },
      },
      { session },
    );
    await audit(`${kind}_updated`, updated._id, session);
    return updated;
  }
  const created = await payrollRepo(kind).create(
    { _id: new Types.ObjectId(docId), ...fields },
    { session },
  );
  await audit(`${kind}_created`, created._id, session);
  return created;
}
export async function ownEmployee(session?: ClientSession) {
  return payrollRepo('employee').findOne({ userId: contextIds().actorId }, { session });
}
export async function listPayroll(
  kind: RecordKind,
  own = false,
): Promise<Record<string, unknown>[]> {
  await requirePayroll(own ? 'payroll.read.own' : 'payroll.read.all');
  if (own) {
    if (!['run', 'leave', 'loan', 'reimbursement', 'employee'].includes(kind))
      throw new Error('Payroll access denied.');
    const employee = await ownEmployee();
    if (!employee) return [];
    if (kind === 'employee') return [{ ...recordData(employee), version: employee.version }];
    if (kind === 'run') {
      const runs = await payrollRepo('run')
        .find({ status: { $in: ['paid', 'locked'] } })
        .sort({ period: -1 });
      return runs.flatMap((row) => {
        const data = recordData(row) as RunData;
        const slip = data.payslips.find((p) => p.employeeId === String(employee._id) && !p.hold);
        return slip
          ? [
              {
                id: String(row._id),
                period: data.period,
                currency: data.currency,
                status: data.status,
                paidAt: data.paidAt,
                payslip: slip,
              },
            ]
          : [];
      });
    }
    return (
      await payrollRepo(kind)
        .find({ employeeId: String(employee._id) })
        .sort({ createdAt: -1 })
    ).map((row) => ({ ...recordData(row), version: row.version }));
  }
  return (await payrollRepo(kind).find().sort({ createdAt: -1 })).map((row) => ({
    ...recordData(row),
    version: row.version,
  }));
}
export async function initializePayroll(input: {
  hrIds: string[];
  approverIds: string[];
  accountsIds: string[];
}) {
  await requirePlatformAdministrator();
  const db = await connectToDatabase();
  const { tenantId } = contextIds();
  const tenant = await TenantModel.findOne({ _id: tenantId, deletedAt: null });
  if (!tenant || !(/^digisol(?:\b|[-_])/i.test(tenant.name) || tenant.slug === 'digisol'))
    throw new Error('Initial payroll rollout is for DigiSol only.');
  if (!input.approverIds.length) throw new Error('Choose at least one approver.');
  await db.connection.transaction(async (session) => {
    if (await payrollRepo('settings').findOne({ key: 'settings' }, { session }))
      throw new Error('Payroll is already initialized.');
    for (const userId of [...input.hrIds, ...input.approverIds, ...input.accountsIds]) {
      if (
        !(await repository(UserModel).findOne(
          { _id: id.parse(userId), role: { $ne: 'client_contact' }, status: 'active' },
          { session },
        ))
      )
        throw new Error('Choose active staff from this tenant.');
    }
    await TenantModel.updateOne(
      { _id: tenantId },
      {
        $set: {
          'modules.payroll': true,
          ...(tenant.commercial?.planSnapshot
            ? { 'commercial.planSnapshot.modules.payroll': true }
            : {}),
        },
      },
      { session },
    );
    for (const [ids, grants] of [
      [input.hrIds, ['payroll.read.all', 'payroll.manage']],
      [input.approverIds, ['payroll.read.all', 'payroll.approve']],
      [input.accountsIds, ['payroll.read.all', 'payroll.pay']],
    ] as [string[], string[]][]) {
      for (const userId of ids)
        await repository(UserModel).updateOne(
          { _id: userId },
          { $addToSet: { permissionGrants: { $each: grants } } },
          { session },
        );
    }
    const config = Settings.parse({ tenantId, approverUserIds: input.approverIds });
    await write(
      'settings',
      { ...config, id: new Types.ObjectId().toString() },
      'settings',
      session,
    );
    const structure = {
      ...Engine.DEFAULT_STRUCTURE(tenantId),
      id: new Types.ObjectId().toString(),
    };
    await write('structure', structure, structure.name, session);
    for (const category of Engine.DEFAULT_CATEGORIES)
      await write(
        'category',
        { ...category, id: new Types.ObjectId().toString() },
        category.code,
        session,
      );
    for (const leave of [
      { code: 'ANNUAL', name: 'Annual leave', paid: true, annualEntitlement: 0 },
      { code: 'UNPAID', name: 'Unpaid leave', paid: false, annualEntitlement: 0 },
    ])
      await write(
        'leaveType',
        { ...Engine.LeaveType.parse(leave), id: new Types.ObjectId().toString() },
        leave.code,
        session,
      );
  });
}
const SELF_KINDS = ['leave', 'loan', 'reimbursement'];
export async function savePayroll(
  kind: Exclude<RecordKind, 'run' | 'accrual' | 'payment' | 'attachment' | 'change'>,
  raw: Record<string, unknown>,
  version?: number,
) {
  if (version !== undefined) z.number().int().nonnegative().parse(version);
  const own = raw.self === true;
  if (own && !SELF_KINDS.includes(kind)) throw new Error('Unsupported employee request.');
  await requirePayroll(
    own
      ? 'payroll.read.own'
      : ['settings', 'category'].includes(kind)
        ? 'payroll.settings'
        : 'payroll.manage',
  );
  return atomic(async (session) => {
    const previous = raw.id
      ? await payrollRepo(kind).findById(id.parse(raw.id), { session })
      : null;
    if (raw.id && !previous) throw new Error('Record not found.');
    if (previous && version === undefined) throw new Error('Reload the record before editing.');
    const old = previous ? recordData(previous) : {};
    const data: Record<string, unknown> & { id: string; tenantId: string } = {
      ...old,
      ...raw,
      id: previous ? String(previous._id) : new Types.ObjectId().toString(),
      tenantId: contextIds().tenantId,
    };
    delete data.self;
    if (own) {
      const employee = await ownEmployee(session);
      if (!employee || (previous?.employeeId && previous.employeeId !== String(employee._id)))
        throw new Error('Employee request not found.');
      data.employeeId = String(employee._id);
    }
    if (SELF_KINDS.includes(kind)) {
      if (previous && !['pending', 'requested', 'submitted'].includes(previous.status))
        throw new Error('Only pending requests can be edited.');
      data.status = kind === 'leave' ? 'pending' : kind === 'loan' ? 'requested' : 'submitted';
      if (kind === 'loan') data.recovered = 0;
      if (kind === 'reimbursement') delete data.payPeriod;
    }
    if (data.employeeId) {
      const employee = await payrollRepo('employee').findById(id.parse(data.employeeId), {
        session,
      });
      if (!employee) throw new Error('Employee not found.');
      data.currency = recordData(employee).currency;
    }
    if (
      kind === 'employee' &&
      previous &&
      old.currency !== data.currency &&
      (await payrollRepo('assignment').count({ employeeId: data.id }, { session }))
    )
      throw new Error('Currency cannot change after salary history exists.');
    if (kind === 'employee' && old.userId && old.userId !== data.userId)
      throw new Error('Linked staff identity cannot be reassigned. Create a separate employee.');
    if (kind === 'employee' && data.status === 'exited' && !data.exitDate)
      throw new Error('Enter an exit date.');
    if (kind === 'employee' && data.userId) {
      if (
        !(await repository(UserModel).findOne(
          { _id: id.parse(data.userId), role: { $ne: 'client_contact' }, status: 'active' },
          { session },
        ))
      )
        throw new Error('Linked staff user not found.');
      if (
        await payrollRepo('employee').findOne(
          { userId: data.userId, _id: { $ne: data.id } },
          { session },
        )
      )
        throw new Error('This staff user already has an employee profile.');
    }
    if (kind === 'assignment') {
      if (
        !(await payrollRepo('structure').findOne(
          { _id: id.parse(data.structureId), status: 'published' },
          { session },
        ))
      )
        throw new Error('Choose a published salary structure.');
      if (!String(data.reason ?? '').trim())
        throw new Error('A reason is required for salary history.');
      if (previous) throw new Error('Salary history is immutable. Add a new effective assignment.');
    }
    if (kind === 'settings') {
      data.zohoMappingStatus = 'pending';
      for (const uid of (data.approverUserIds as string[]) ?? [])
        if (
          !(await repository(UserModel).findOne(
            { _id: id.parse(uid), status: 'active', role: { $ne: 'client_contact' } },
            { session },
          ))
        )
          throw new Error('Approver must be active tenant staff.');
      if (!(data.approverUserIds as string[]).length) throw new Error('Choose a named approver.');
      if ((data.requiredApprovals as number) > (data.approverUserIds as string[]).length)
        throw new Error('Not enough named approvers.');
    }
    if (kind === 'recurringItem') {
      data.createdBy = old.createdBy ?? contextIds().actorId;
      if (data.endPeriod && String(data.endPeriod) < String(data.startPeriod))
        throw new Error('End month must follow start month.');
      if (!(await payrollRepo('category').findOne({ key: String(data.categoryCode) }, { session })))
        throw new Error('Pay category not found.');
    }
    if (kind === 'commissionPlan') {
      const employee = await payrollRepo('employee').findById(String(data.employeeId), { session });
      if (!employee?.userId || employee.userId !== data.userId)
        throw new Error('The commission plan user must match the linked employee.');
    }
    if (kind === 'employee' && data.exitDate && String(data.exitDate) < String(data.joinDate))
      throw new Error('Exit date cannot precede join date.');
    const parsed = SCHEMAS[kind].parse(data) as Record<string, unknown>;
    if (kind === 'structure') {
      if (previous && previous.status === 'published')
        throw new Error('Create a new structure version instead of changing a published one.');
      const errors = Engine.validateStructure(parsed as Engine.SalaryStructure);
      if (errors.length) throw new Error(errors.join(' '));
    }
    if (kind === 'leave') {
      if (String(parsed.to) < String(parsed.from))
        throw new Error('Leave end date must follow start date.');
      if (!(await payrollRepo('leaveType').findOne({ key: String(parsed.typeCode) }, { session })))
        throw new Error('Leave type not found.');
      if (
        await payrollRepo('leave').findOne(
          {
            employeeId: String(parsed.employeeId),
            status: { $in: ['pending', 'approved'] },
            'data.from': { $lte: parsed.to },
            'data.to': { $gte: parsed.from },
            _id: { $ne: data.id },
          },
          { session },
        )
      )
        throw new Error('This leave request overlaps existing leave.');
    }
    const key =
      kind === 'settings'
        ? 'settings'
        : kind === 'employee'
          ? String(parsed.code)
          : ['category', 'leaveType'].includes(kind)
            ? String(parsed.code)
            : data.id;
    return String(
      (
        await write(
          kind,
          { ...parsed, id: data.id, currency: data.currency },
          key,
          session,
          previous ? version : undefined,
        )
      )._id,
    );
  });
}
export async function decideRequest(
  kind: 'leave' | 'loan' | 'reimbursement',
  recordId: string,
  approve: boolean,
  payPeriod?: string,
) {
  await requirePayroll('payroll.manage');
  return atomic(async (session) => {
    const row = await payrollRepo(kind).findById(id.parse(recordId), { session });
    if (!row || !['pending', 'requested', 'submitted'].includes(row.status))
      throw new Error('Pending request not found.');
    const data = recordData(row);
    data.status = approve
      ? kind === 'leave'
        ? 'approved'
        : kind === 'loan'
          ? 'active'
          : 'approved'
      : 'rejected';
    if (kind === 'leave') data.approverId = contextIds().actorId;
    if (kind === 'reimbursement' && approve) data.payPeriod = Engine.Period.parse(payPeriod);
    await write(kind, data, row.key, session, row.version);
  });
}
export type RunData = Engine.PayrollRun & {
  inputs: Engine.RunInput[];
  accrualIds: string[];
  employeeSnapshots?: Engine.Employee[];
  summaries?: Record<string, Engine.MonthSummary>;
  yearToDate?: Record<string, Record<string, number>>;
  mutationRevision?: number;
};
function readRun(row: { data: Record<string, unknown> }): RunData {
  return recordData(row) as RunData;
}
export async function createRun(period: string, currency: string) {
  await requirePayroll('payroll.manage');
  Engine.Period.parse(period);
  Engine.Currency.parse(currency);
  return atomic(async (session) => {
    const config = await settings(session);
    if (config.approvalLimits[currency] === undefined)
      throw new Error('Configure an approval threshold for this currency first.');
    const run: RunData = {
      id: new Types.ObjectId().toString(),
      tenantId: contextIds().tenantId,
      period,
      currency,
      status: 'draft',
      payslips: [],
      events: [],
      inputs: [],
      accrualIds: [],
    };
    return String((await write('run', run, `${period}.${currency}`, session))._id);
  });
}
export async function saveRunInput(runId: string, employeeId: string, raw: unknown) {
  await requirePayroll('payroll.manage');
  await atomic(async (session) => {
    const row = await payrollRepo('run').findById(id.parse(runId), { session });
    if (!row || !['draft', 'calculated'].includes(row.status))
      throw new Error('This run cannot be edited.');
    const run = readRun(row);
    const employee = await payrollRepo('employee').findById(id.parse(employeeId), { session });
    if (!employee || employee.currency !== run.currency)
      throw new Error('Employee currency mismatch.');
    const parsed = Engine.RunInput.omit({ adjustments: true }).parse(raw);
    const old = run.inputs.find((x) => x.employeeId === employeeId);
    run.inputs = [
      ...run.inputs.filter((x) => x.employeeId !== employeeId),
      { ...parsed, employeeId, adjustments: old?.adjustments ?? [] },
    ];
    run.status = 'draft';
    run.payslips = [];
    run.approvals = [];
    await write('run', run, row.key, session, row.version);
  });
}
export async function addItem(
  runId: string,
  employeeId: string,
  raw: {
    categoryCode: string;
    amount?: number;
    index?: number;
    componentCode?: string;
    note?: string;
    value?: number;
    rate?: number;
    qty?: number;
    unitRate?: number;
    ref?: Engine.Adjustment['ref'];
    overrideReason?: string;
  },
) {
  await requirePayroll('payroll.manage');
  await atomic(async (session) => {
    const row = await payrollRepo('run').findById(id.parse(runId), { session });
    if (!row || !['draft', 'calculated'].includes(row.status))
      throw new Error('This run cannot be edited.');
    const run = readRun(row),
      config = await settings(session);
    if (config.approvalLimits[run.currency] === undefined)
      throw new Error('Configure an approval threshold for this currency.');
    const employee = await payrollRepo('employee').findById(id.parse(employeeId), { session });
    if (!employee || employee.currency !== run.currency)
      throw new Error('Employee not found in this currency.');
    const category = await payrollRepo('category').findOne({ key: raw.categoryCode }, { session });
    if (!category) throw new Error('Category not found.');
    const c = Engine.PayItemCategory.parse(recordData(category));
    const input =
      run.inputs.find((x) => x.employeeId === employeeId) ?? Engine.RunInput.parse({ employeeId });
    const previousItem = raw.index !== undefined ? input.adjustments[raw.index] : undefined;
    if (raw.index !== undefined && !previousItem) throw new Error('Pay item not found.');
    if (raw.ref) {
      const ref = raw.ref;
      id.parse(ref.id);
      if (ref.type === 'contract') {
        if (!(await repository(ContractModel).findById(ref.id, { session })))
          throw new Error('Linked contract not found.');
      } else if (ref.type === 'deal') {
        if (!(await repository(OpportunityModel).findById(ref.id, { session })))
          throw new Error('Linked deal not found.');
      } else if (ref.type === 'ticket') {
        if (!(await repository(TicketModel).findById(ref.id, { session })))
          throw new Error('Linked ticket not found.');
      } else if (ref.type === 'project') {
        if (!(await repository(SpaceModel).findById(ref.id, { session })))
          throw new Error('Linked project not found.');
      } else throw new Error('Unsupported manual link.');
    }
    let amount = raw.amount;
    if (amount === undefined && c.calc === 'percent_of_component') {
      const assignment = Engine.assignmentFor(
        await load<Engine.SalaryAssignment>('assignment', session),
        employeeId,
        run.period,
      );
      if (!assignment) throw new Error('Salary assignment missing.');
      const structure = await payrollRepo('structure').findById(assignment.structureId, {
        session,
      });
      if (!structure) throw new Error('Salary structure missing.');
      const base = Engine.resolveComponents(
        Engine.SalaryStructure.parse(recordData(structure)).components,
        assignment.amounts,
        assignment.package,
      ).get(raw.componentCode ?? 'BASIC');
      if (base === undefined || !Number.isFinite(raw.rate))
        throw new Error('Choose a component and rate.');
      amount = Engine.fromMinor(Engine.mulRatio(base, Number(raw.rate) / 100));
    }
    if (previousItem?.source === 'auto' && previousItem.code !== c.code)
      throw new Error('An automatic item must retain its category.');
    const item = Engine.addRunItem({
      ...raw,
      amount,
      autoAmount:
        previousItem?.source === 'auto'
          ? (previousItem.override?.originalAmount ?? previousItem.amount)
          : undefined,
      ref: previousItem?.source === 'auto' ? previousItem.ref : raw.ref,
      category: c,
      settings: { ...config, itemApprovalLimit: config.approvalLimits[run.currency] },
      actor: { id: contextIds().actorId, roles: ['hr'] },
      monthToDateForCategory: input.adjustments
        .filter((a, index) => a.code === c.code && index !== raw.index)
        .reduce((s, a) => s + a.amount, 0),
    });
    if (raw.index === undefined) input.adjustments.push(item);
    else input.adjustments.splice(raw.index, 1, item);
    run.inputs = [...run.inputs.filter((x) => x.employeeId !== employeeId), input];
    run.status = 'draft';
    run.payslips = [];
    run.approvals = [];
    await write('run', run, row.key, session, row.version);
  });
}
export async function approveItem(runId: string, employeeId: string, index: number) {
  await requirePayroll('payroll.approve');
  await atomic(async (session) => {
    const row = await payrollRepo('run').findById(id.parse(runId), { session });
    if (!row || !['draft', 'calculated'].includes(row.status))
      throw new Error('This run cannot be edited.');
    const run = readRun(row),
      config = await settings(session),
      input = run.inputs.find((x) => x.employeeId === employeeId);
    if (!input?.adjustments[index]) throw new Error('Item not found.');
    if (!config.approverUserIds.includes(contextIds().actorId))
      throw new Error('You are not a named approver.');
    input.adjustments[index] = Engine.approveRunItem(
      input.adjustments[index],
      contextIds().actorId,
      config,
    );
    run.status = 'draft';
    run.payslips = [];
    run.approvals = [];
    await write('run', run, row.key, session, row.version);
  });
}
async function load<T>(kind: RecordKind, session: ClientSession): Promise<T[]> {
  return (await payrollRepo(kind).find({}, { session })).map((x) => recordData(x) as T);
}
export async function changeRun(
  runId: string,
  action: Engine.RunAction,
  opts: { reason?: string; paymentRef?: string } = {},
) {
  await requirePayroll(
    action === 'approve' || action === 'reopen'
      ? 'payroll.approve'
      : action === 'mark_paid' || action === 'lock'
        ? 'payroll.pay'
        : 'payroll.manage',
  );
  return atomic(async (session) => {
    const row = await payrollRepo('run').findById(id.parse(runId), { session });
    if (!row) throw new Error('Run not found.');
    let run = readRun(row);
    const config = await settings(session),
      actor = contextIds().actorId;
    if (action === 'mark_paid' && ['paid', 'locked'].includes(run.status)) {
      if (run.paymentRef !== opts.paymentRef)
        throw new Error('Run already paid with a different reference.');
      return;
    }
    if (action === 'approve' && run.mutationRevision !== config.mutationRevision - 1)
      throw new Error('Payroll inputs changed. Recalculate before approval.');
    if (action === 'approve' && run.calculatedBy === actor)
      throw new Error('Preparer cannot approve their own payroll.');
    if (['approve', 'reopen'].includes(action) && !config.approverUserIds.includes(actor))
      throw new Error('You are not a named payroll approver.');
    if (action === 'mark_paid' && !opts.paymentRef?.trim())
      throw new Error('A payment reference is required.');
    let payslips = run.payslips;
    if (action === 'calculate') {
      if (config.approvalLimits[run.currency] === undefined)
        throw new Error('Configure an approval threshold for this currency before calculating.');
      await synchronizeCommissions(run, config, session);
      await synchronizeRecurring(run, config, session);
      const categories = await load<Engine.PayItemCategory>('category', session);
      for (const input of run.inputs)
        for (const item of input.adjustments) {
          const category = categories.find((c) => c.code === item.code);
          if (!category?.active)
            throw new Error('Review inactive payroll categories before calculating.');
          const required =
            category.alwaysNeedsApproval || item.amount > config.approvalLimits[run.currency];
          item.approval = { ...item.approval, required };
          if (
            item.approval.approvedBy &&
            !config.approverUserIds.includes(item.approval.approvedBy)
          )
            delete item.approval.approvedBy;
          if (
            category.monthlyCap &&
            input.adjustments
              .filter((a) => a.code === item.code)
              .reduce((sum, a) => sum + a.amount, 0) > category.monthlyCap
          )
            throw new Error(`${category.name} exceeds its monthly cap.`);
        }
      const employees = await load<Engine.Employee>('employee', session),
        assignments = await load<Engine.SalaryAssignment>('assignment', session),
        structures = await load<Engine.SalaryStructure>('structure', session),
        leaveTypes = await load<Engine.LeaveType>('leaveType', session),
        leaveRequests = await load<Engine.LeaveRequest>('leave', session),
        loans = await load<Engine.Loan>('loan', session),
        reimbursements = await load<Engine.Reimbursement>('reimbursement', session);
      const priorRuns = (
        await payrollRepo('run').find(
          {
            _id: { $ne: run.id },
            status: { $in: ['paid', 'locked'] },
            currency: run.currency,
            period: { $gte: run.period.slice(0, 4) + '-01', $lte: run.period },
          },
          { session },
        )
      ).map(readRun);
      payslips = [];
      run.yearToDate = {};
      run.employeeSnapshots = employees.filter((e) => e.currency === run.currency);
      run.summaries = {};
      for (const employee of employees.filter((e) => e.currency === run.currency)) {
        if (
          employee.joinDate > Engine.periodBounds(run.period).end ||
          (employee.exitDate && employee.exitDate < Engine.periodBounds(run.period).start)
        )
          continue;
        const assignment = Engine.assignmentFor(assignments, employee.id, run.period);
        if (!assignment) throw new Error(`Missing salary assignment: ${employee.name}`);
        const structure = structures.find((s) => s.id === assignment.structureId);
        if (!structure) throw new Error(`Missing salary structure: ${employee.name}`);
        const slip = Engine.calculatePayslip({
          settings: config,
          period: run.period,
          employee,
          assignment,
          structure,
          leaveTypes,
          leaveRequests,
          loans,
          reimbursements: reimbursements
            .filter((r) => r.payPeriod && r.payPeriod <= run.period)
            .map((r) => ({ ...r, payPeriod: run.period })),
          input: run.inputs.find((i) => i.employeeId === employee.id),
        });
        if (slip) {
          payslips.push(slip);
          run.summaries[employee.id] = await monthSummary(employee.id, run.period);
          run.yearToDate[employee.id] = Engine.ytdTotals([
            ...priorRuns.flatMap((r) =>
              r.payslips.filter((p) => p.employeeId === employee.id && !p.hold),
            ),
            slip,
          ]);
        }
      }
      if (!payslips.length)
        throw new Error('No employees with salary assignments in this period and currency.');
    }
    run = {
      ...run,
      ...Engine.transition(
        run,
        action,
        {
          id: actor,
          roles: [
            action === 'approve' || action === 'reopen'
              ? 'payroll_approver'
              : action === 'mark_paid' || action === 'lock'
                ? 'accounts'
                : 'payroll_officer',
          ],
        },
        { ...opts, payslips, policy: config },
      ),
    };
    if (action === 'calculate' || action === 'approve')
      run.mutationRevision = config.mutationRevision;
    if (action === 'mark_paid') {
      const effects = Engine.postingEffects(run);
      for (const effect of effects.loanIncrements) {
        const loan = await payrollRepo('loan').findById(effect.loanId, { session });
        if (!loan) throw new Error('Loan no longer available.');
        const data = Engine.Loan.parse(recordData(loan));
        data.recovered = Math.round((data.recovered + effect.amount) * 100) / 100;
        if (data.recovered > data.principal)
          throw new Error('Loan recovery exceeds remaining principal.');
        if (data.recovered === data.principal) data.status = 'closed';
        await write('loan', data, loan.key, session, loan.version);
      }
      for (const reimbursementId of effects.reimbursementsPaid) {
        const reimbursement = await payrollRepo('reimbursement').findOne(
          { _id: reimbursementId, status: 'approved' },
          { session },
        );
        if (!reimbursement) throw new Error('Reimbursement was already paid or changed.');
        await write(
          'reimbursement',
          {
            ...recordData(reimbursement),
            status: 'paid',
            payPeriod: run.period,
            paidRunId: run.id,
          },
          reimbursement.key,
          session,
          reimbursement.version,
        );
      }
      const runAccruals = [];
      for (const accrualId of run.accrualIds) {
        const accrual = await payrollRepo('accrual').findById(accrualId, { session });
        if (accrual) runAccruals.push(accrual);
      }
      for (const contractId of [
        ...new Set(runAccruals.map((a) => String(recordData(a).contractId))),
      ]) {
        const claims = runAccruals.filter((a) => recordData(a).contractId === contractId);
        const earned = claims.reduce(
          (sum, a) => sum + Engine.toMinor(Number(recordData(a).amount)),
          0,
        );
        const input = run.inputs.find((i) => i.employeeId === claims[0].employeeId);
        let remaining = Engine.toMinor(
          input?.adjustments.find(
            (a) => a.code === 'COMMISSION' && a.source === 'auto' && a.ref?.id === contractId,
          )?.amount ?? 0,
        );
        const totalPaid = remaining;
        for (const [index, claim] of claims.entries()) {
          const data = recordData(claim);
          if (!run.payslips.some((p) => !p.hold && p.employeeId === claim.employeeId)) {
            delete data.runId;
            await write('accrual', data, claim.key, session, claim.version);
            continue;
          }
          const amount =
            index === claims.length - 1
              ? remaining
              : Math.min(
                  remaining,
                  Math.round((totalPaid * Engine.toMinor(Number(data.amount))) / earned),
                );
          remaining -= amount;
          await write(
            'accrual',
            { ...data, status: 'paid', paidAmount: Engine.fromMinor(amount), runId: run.id },
            claim.key,
            session,
            claim.version,
          );
        }
      }
    }
    if (action === 'mark_paid') {
      for (const accrual of await payrollRepo('accrual').find(
        { 'data.clawbackRunId': run.id, status: 'paid' },
        { session },
      )) {
        const data = recordData(accrual);
        if (run.payslips.some((p) => !p.hold && p.employeeId === accrual.employeeId))
          data.status = 'clawed_back';
        else delete data.clawbackRunId;
        await write('accrual', data, accrual.key, session, accrual.version);
      }
      if (config.emailPayslipsOnPaid)
        for (const slip of run.payslips.filter((p) => !p.hold)) {
          const employee = await payrollRepo('employee').findById(slip.employeeId, { session });
          const data = employee ? Engine.Employee.parse(recordData(employee)) : null;
          if (data?.email && data.userId)
            await queueEmail(
              {
                kind: 'payroll_paid',
                sourceModule: 'payroll',
                to: data.email,
                subject: `Payslip available: ${run.period}`,
                text: `Your payslip for ${run.period} is ready. Sign in to Worktello to download it: ${appBaseUrl()}/payroll/my-pay`,
              },
              session,
            );
        }
    }
    if (action === 'cancel')
      for (const accrual of await payrollRepo('accrual').find(
        { $or: [{ 'data.runId': run.id }, { 'data.clawbackRunId': run.id }] },
        { session },
      )) {
        const data = recordData(accrual);
        delete data.runId;
        delete data.clawbackRunId;
        await write('accrual', data, accrual.key, session, accrual.version);
      }
    await write(
      'run',
      run,
      action === 'cancel' ? `${row.key}.cancelled.${run.id}` : row.key,
      session,
      row.version,
    );
  });
}
export async function exportRun(runId: string, format: 'bank' | 'journal' | 'register') {
  await requirePayroll('payroll.pay');
  const row = await payrollRepo('run').findById(id.parse(runId));
  if (!row || !['approved', 'paid', 'locked'].includes(row.status))
    throw new Error('Approve this run before exporting.');
  const run = readRun(row);
  if (format === 'journal')
    throw new Error(
      'Zoho account mapping is pending owner confirmation. Journal export is unavailable.',
    );
  if (format === 'bank') {
    if (!run.employeeSnapshots)
      throw new Error('Bank snapshots are missing. Recalculate before approval.');
    return Engine.bankTransferCsv(run, run.employeeSnapshots).csv;
  }
  const esc = (v: unknown) => {
    let value = String(v ?? '');
    if (typeof v === 'string' && /^[=+@\-\t\r]/.test(value)) value = "'" + value;
    return `"${value.replaceAll('"', '""')}"`;
  };
  return [
    ['Employee', 'Name', 'Currency', 'Gross', 'Deductions', 'Net'],
    ...run.payslips
      .filter((p) => !p.hold)
      .map((p) => [p.employeeCode, p.employeeName, p.currency, p.gross, p.totalDeductions, p.net]),
  ]
    .map((row) => row.map(esc).join(','))
    .join('\r\n');
}
export async function recordContractPayment(raw: unknown) {
  await requirePayroll('payroll.pay');
  return atomic(async (session) => {
    const payment = PaymentSchema.parse({
      ...(raw as object),
      id: new Types.ObjectId().toString(),
      tenantId: contextIds().tenantId,
    });
    const contract = await repository(ContractModel).findById(payment.contractId, { session });
    if (!contract || contract.currency !== payment.currency)
      throw new Error('Contract not found or currency mismatch.');
    await write('payment', payment, `${payment.contractId}.${payment.reference}`, session);
  });
}

export async function payrollStaff() {
  await requirePlatformAdministrator();
  await connectToDatabase();
  return repository(UserModel)
    .find({ status: 'active', role: { $ne: 'client_contact' } })
    .select('_id name email');
}
export async function contractChoices() {
  await requirePayroll('payroll.read.all');
  await assertModuleAccess('crm');
  return (await repository(ContractModel).find()).map((c) => ({
    id: String(c._id),
    number: c.number,
    currency: c.currency,
    status: c.status,
    salesOwnerId: c.salesOwnerId ? String(c.salesOwnerId) : '',
    commissionRate: c.commissionRate,
    commissionSignedAt: c.commissionSignedAt?.toISOString().slice(0, 10),
  }));
}
export async function setCommissionContract(raw: unknown) {
  await requirePayroll('payroll.manage');
  await assertModuleAccess('crm');
  const data = z
    .object({
      contractId: id,
      salesOwnerId: id,
      commissionRate: z.number().min(0).max(100).optional(),
      cancelledAt: Engine.IsoDate.optional(),
      commissionSignedAt: Engine.IsoDate.optional(),
    })
    .parse(raw);
  await atomic(async (session) => {
    const contract = await repository(ContractModel).findById(data.contractId, { session });
    if (!contract) throw new Error('Contract not found.');
    if (
      !(await repository(UserModel).findOne(
        { _id: data.salesOwnerId, status: 'active', role: { $ne: 'client_contact' } },
        { session },
      ))
    )
      throw new Error('Sales owner not found.');
    if (data.cancelledAt && contract.status !== 'cancelled')
      throw new Error('Only cancelled contracts can have a cancellation date.');
    if (data.cancelledAt && data.cancelledAt < contract.startDate)
      throw new Error('Cancellation date precedes the contract term.');
    await repository(ContractModel).updateOne(
      { _id: contract._id },
      {
        $set: {
          salesOwnerId: new Types.ObjectId(data.salesOwnerId),
          ...(data.commissionRate !== undefined ? { commissionRate: data.commissionRate } : {}),
          ...(data.commissionSignedAt
            ? { commissionSignedAt: new Date(data.commissionSignedAt) }
            : {}),
          ...(data.cancelledAt ? { cancelledAt: new Date(data.cancelledAt) } : {}),
        },
      },
      { session },
    );
    await audit('contract_commission_updated', contract._id, session);
  });
}
async function commissionContracts(
  session: ClientSession,
): Promise<(Engine.ContractForCommission & { currency: string })[]> {
  const signatures = await repository(AgreementSignatureModel)
    .find({ status: 'signed' }, { session })
    .select('contractId signedAt')
    .sort({ signedAt: -1 });
  return (await repository(ContractModel).find({}, { session })).flatMap((c) => {
    const signedAt =
      signatures.find((s) => String(s.contractId) === String(c._id))?.signedAt ??
      c.commissionSignedAt;
    if (!c.salesOwnerId || !signedAt || c.status === 'draft') return [];
    return [
      {
        id: String(c._id),
        number: c.number,
        customer: '',
        currency: c.currency,
        value:
          (c.valueMinorUnits / 100) *
          billingSchedule(c.startDate, c.endDate, c.billingFrequency).length,
        ownerUserId: String(c.salesOwnerId),
        signedAt: signedAt.toISOString(),
        status: c.status === 'renewed' ? 'expired' : c.status,
        cancelledAt: c.cancelledAt?.toISOString(),
        isRenewal: !!c.renewedFromId,
        ...(c.commissionRate != null ? { commissionRate: c.commissionRate } : {}),
      },
    ];
  });
}
async function synchronizeCommissions(
  run: RunData,
  config: z.infer<typeof Settings>,
  session: ClientSession,
) {
  const contracts = await commissionContracts(session);
  const existing = await load<Engine.CommissionAccrual & { runId?: string }>('accrual', session);
  const plans = (await load<Engine.CommissionPlan>('commissionPlan', session))
    .filter((plan) => plan.active)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  const payments = (await load<Engine.PaymentReceived>('payment', session)).filter(
    (p) => p.receivedAt.slice(0, 7) <= run.period,
  );
  const employees = await load<Engine.Employee>('employee', session);
  const eligibleContracts = contracts.filter((contract) => {
    const plan = plans.find(
      (p) => p.userId === contract.ownerUserId && p.effectiveFrom <= contract.signedAt.slice(0, 10),
    );
    const employee = employees.find((e) => e.id === plan?.employeeId);
    if (
      employee &&
      employee.currency !== contract.currency &&
      employee.currency === run.currency &&
      (contract.commissionRate ?? plan?.rate ?? 0) > 0 &&
      payments.some(
        (p) => p.contractId === contract.id && !existing.some((a) => a.paymentId === p.id),
      )
    )
      throw new Error(
        `Contract ${contract.number} currency differs from the employee payroll currency. Automatic commission requires matching currencies.`,
      );
    return !!employee && employee.currency === contract.currency;
  });
  // Catch up earlier unprocessed receipts, while retaining the original receipt period.
  for (const period of [...new Set(payments.map((p) => p.receivedAt.slice(0, 7)))].sort()) {
    const fresh = Engine.accrueCommissions({
      period,
      contracts: eligibleContracts,
      payments,
      plans,
      existing,
      newId: () => new Types.ObjectId().toString(),
    });
    for (const accrual of fresh) {
      await write(
        'accrual',
        { ...accrual, currency: contracts.find((c) => c.id === accrual.contractId)?.currency },
        accrual.paymentId,
        session,
      );
      existing.push(accrual);
    }
  }
  const originalInputs = structuredClone(run.inputs);
  run.inputs.forEach((input) => {
    input.adjustments = input.adjustments.filter(
      (a) => !(a.source === 'auto' && a.code === 'COMMISSION'),
    );
  });
  const available = existing.filter(
    (a) =>
      contracts.some(
        (c) => c.id === a.contractId && !['cancelled', 'terminated'].includes(c.status),
      ) &&
      a.status === 'pending' &&
      (!a.runId || a.runId === run.id) &&
      employees.some((e) => e.id === a.employeeId && e.currency === run.currency),
  );
  run.accrualIds = available.map((a) => a.id);
  for (const employeeId of [...new Set(available.map((a) => a.employeeId))]) {
    const input =
      run.inputs.find((i) => i.employeeId === employeeId) ?? Engine.RunInput.parse({ employeeId });
    const fresh = Engine.commissionRunItems(
      available,
      contracts,
      { ...config, itemApprovalLimit: config.approvalLimits[run.currency] },
      employeeId,
    );
    for (const item of fresh) {
      const old = originalInputs
        .find((i) => i.employeeId === employeeId)
        ?.adjustments.find(
          (a) =>
            a.source === 'auto' &&
            a.code === 'COMMISSION' &&
            a.ref?.id === item.ref?.id &&
            (a.override?.originalAmount ?? a.amount) === item.amount,
        );
      if (old) {
        item.amount = old.amount;
        item.override = old.override;
        item.approval = old.approval;
      }
    }
    input.adjustments = [
      ...input.adjustments.filter((a) => !(a.code === 'COMMISSION' && a.source === 'auto')),
      ...fresh,
    ];
    run.inputs = [...run.inputs.filter((i) => i.employeeId !== employeeId), input];
  }
  for (const accrual of available) {
    const row = await payrollRepo('accrual').findById(accrual.id, { session });
    if (row)
      await write('accrual', { ...recordData(row), runId: run.id }, row.key, session, row.version);
  }
}
async function pendingClawbacks(
  period: string,
  config: z.infer<typeof Settings>,
  session: ClientSession,
) {
  const contracts = await commissionContracts(session);
  const accruals = (
    await load<Engine.CommissionAccrual & { paidAmount?: number }>('accrual', session)
  ).map((a) => ({ ...a, amount: a.paidAmount ?? a.amount }));
  return [
    ...new Set(
      contracts.flatMap((c) =>
        c.cancelledAt && c.cancelledAt.slice(0, 7) <= period ? [c.cancelledAt.slice(0, 7)] : [],
      ),
    ),
  ]
    .flatMap((month) =>
      Engine.clawbackSuggestions({ period: month, contracts, accruals, settings: config }),
    )
    .filter((s) => s.item.amount > 0);
}
export async function clawbacks(period: string) {
  await requirePayroll('payroll.manage');
  Engine.Period.parse(period);
  const db = await connectToDatabase();
  return db.connection.transaction(async (session) =>
    pendingClawbacks(period, await settings(session), session),
  );
}
export async function confirmClawback(
  runId: string,
  contractId: string,
  employeeId: string,
  reason: string,
) {
  await requirePayroll('payroll.manage');
  if (reason.trim().length < 5) throw new Error('Explain the clawback.');
  await atomic(async (session) => {
    const row = await payrollRepo('run').findById(id.parse(runId), { session });
    if (!row || !['draft', 'calculated'].includes(row.status))
      throw new Error('Editable run not found.');
    const run = readRun(row);
    const config = await settings(session);
    const employee = await payrollRepo('employee').findById(employeeId, { session });
    if (!employee || employee.currency !== run.currency)
      throw new Error('Employee currency mismatch.');
    const suggestions = await pendingClawbacks(
      run.period,
      { ...config, itemApprovalLimit: config.approvalLimits[run.currency] },
      session,
    );
    const suggestion = suggestions.find(
      (s) => s.contractId === contractId && s.employeeId === employeeId,
    );
    if (!suggestion) throw new Error('No eligible clawback.');
    const input =
      run.inputs.find((i) => i.employeeId === employeeId) ?? Engine.RunInput.parse({ employeeId });
    if (input.adjustments.some((i) => i.code === 'CLAWBACK' && i.ref?.id === contractId))
      throw new Error('Clawback is already included.');
    for (const accrualId of suggestion.accrualIds) {
      const claim = await payrollRepo('accrual').findById(accrualId, { session });
      const data = claim ? recordData(claim) : {};
      if (data.clawbackRunId && data.clawbackRunId !== run.id)
        throw new Error('Clawback is reserved by another payroll run.');
      if (claim)
        await write(
          'accrual',
          { ...data, clawbackRunId: run.id },
          claim.key,
          session,
          claim.version,
        );
    }
    input.adjustments.push({ ...suggestion.item, note: reason, addedBy: contextIds().actorId });
    run.inputs = [...run.inputs.filter((i) => i.employeeId !== employeeId), input];
    run.status = 'draft';
    run.payslips = [];
    run.approvals = [];
    await write('run', run, row.key, session, row.version);
  });
}
export async function monthSummary(employeeId: string, period: string, own = false) {
  await requirePayroll(own ? 'payroll.read.own' : 'payroll.read.all');
  Engine.Period.parse(period);
  const row = await payrollRepo('employee').findById(id.parse(employeeId));
  if (!row || (own && row.userId !== contextIds().actorId)) throw new Error('Employee not found.');
  const employee = Engine.Employee.parse(recordData(row)),
    config = await settings();
  const date = (value: Date | null | undefined) => value?.toISOString();
  const userId = employee.userId;
  const time = userId
    ? await repository(TimeEntryModel).find({
        userId,
        workDate: {
          $gte: new Date(`${period}-01`),
          $lt: new Date(
            new Date(`${period}-01`).setUTCMonth(new Date(`${period}-01`).getUTCMonth() + 1),
          ),
        },
      })
    : [];
  const tasks = userId ? await repository(TaskModel).find({ assigneeIds: userId }) : [];
  const tickets = userId ? await repository(TicketModel).find({ assigneeId: userId }) : [];
  return Engine.buildMonthSummary({
    period,
    settings: config,
    employee,
    userId: userId ?? '',
    leaveTypes: (await payrollRepo('leaveType').find()).map((x) =>
      Engine.LeaveType.parse(recordData(x)),
    ),
    leaveRequests: (await payrollRepo('leave').find({ employeeId })).map((x) =>
      Engine.LeaveRequest.parse(recordData(x)),
    ),
    carriedForward: Object.fromEntries(
      config.leaveOpening
        .filter((x) => x.employeeId === employeeId && x.year === +period.slice(0, 4))
        .map((x) => [x.typeCode, x.days]),
    ),
    timeEntries: time.map((t) => ({
      userId: String(t.userId),
      date: t.workDate.toISOString().slice(0, 10),
      minutes: t.minutes,
      kind: t.ticketId ? 'ticket' : 'task',
    })),
    tasks: tasks.map((t) => ({
      id: String(t._id),
      assigneeId: userId!,
      createdAt: t.createdAt.toISOString(),
      dueDate: date(t.endAt),
      closedAt: date(t.closedAt),
    })),
    tickets: tickets.map((t) => ({
      id: String(t._id),
      assigneeId: userId!,
      createdAt: t.createdAt.toISOString(),
      firstResponseAt: date(t.firstRespondedAt),
      resolvedAt: date(t.resolvedAt ?? t.closedAt),
      slaDueAt: date(t.resolutionDueAt),
    })),
  });
}

export async function importPayroll(buffer: Buffer, apply = false) {
  await requirePayroll('payroll.manage');
  const sheets = await readPayrollWorkbook(buffer);
  const work = async (session: ClientSession) => {
    const errors: string[] = [],
      pending: { kind: RecordKind; key: string; data: Record<string, unknown> }[] = [];
    const employees = new Map(
      (await payrollRepo('employee').find({}, { session })).map((row) => [
        row.key,
        Engine.Employee.parse(recordData(row)),
      ]),
    );
    const structures = (
      await payrollRepo('structure').find({ status: 'published' }, { session })
    ).map((row) => Engine.SalaryStructure.parse(recordData(row)));
    const configRow = await payrollRepo('settings').findOne({ key: 'settings' }, { session });
    if (!configRow) throw new Error('Payroll setup incomplete.');
    const config = Settings.parse(recordData(configRow));
    for (const [index, row] of sheets.Employees.entries())
      try {
        const code = String(row['Employee code']);
        if (employees.has(code)) {
          const old = employees.get(code)!;
          if (
            old.name !== row.Name ||
            old.currency !== String(row.Currency).toUpperCase() ||
            old.joinDate !== row['Join date']
          )
            throw new Error('Employee code already exists with different details.');
          continue;
        }
        const email = String(row['Worktello email']).toLowerCase();
        const user = email
          ? await repository(UserModel).findOne(
              { email, status: 'active', role: { $ne: 'client_contact' } },
              { session },
            )
          : null;
        if (email && !user) throw new Error('Worktello email does not match active tenant staff.');
        if (user && [...employees.values()].some((e) => e.userId === String(user._id)))
          throw new Error('Staff user already linked to another employee.');
        const employee = Engine.Employee.parse({
          id: new Types.ObjectId().toString(),
          tenantId: contextIds().tenantId,
          code,
          name: row.Name,
          userId: user ? String(user._id) : undefined,
          email: email || undefined,
          joinDate: row['Join date'],
          currency: row.Currency,
          department: row.Department,
          designation: row.Designation,
          payment: {
            method: row.IBAN || row['Account number'] ? 'bank' : 'cash',
            bankName: row['Bank name'],
            iban: row.IBAN,
            accountNo: row['Account number'],
          },
        });
        employees.set(code, employee);
        pending.push({ kind: 'employee', key: code, data: employee });
      } catch (e) {
        errors.push(
          `Employees row ${index + 2}: ${e instanceof Error ? e.message : 'Invalid row'}`,
        );
      }
    for (const [index, row] of sheets.Assignments.entries())
      try {
        const employee = employees.get(String(row['Employee code']));
        if (!employee) throw new Error('Employee code not found.');
        const structure = structures.find((s) => s.name === row['Structure name']);
        if (!structure) throw new Error('Published structure name not found.');
        const key = `${employee.id}.${row['Effective from']}`;
        const existing = await payrollRepo('assignment').findOne(
          { employeeId: employee.id, 'data.effectiveFrom': row['Effective from'] },
          { session },
        );
        if (existing) {
          const old = Engine.SalaryAssignment.parse(recordData(existing));
          if (old.structureId !== structure.id || old.package !== Number(row['Monthly package']))
            throw new Error('Existing salary assignment has different values.');
          continue;
        }
        if (pending.some((p) => p.kind === 'assignment' && p.key === key))
          throw new Error('Duplicate salary assignment row.');
        const assignment = Engine.SalaryAssignment.parse({
          id: new Types.ObjectId().toString(),
          tenantId: contextIds().tenantId,
          employeeId: employee.id,
          structureId: structure.id,
          effectiveFrom: row['Effective from'],
          package: Number(row['Monthly package']),
          reason: row.Reason,
        });
        if (!assignment.reason?.trim()) throw new Error('A salary assignment reason is required.');
        Engine.resolveComponents(structure.components, assignment.amounts, assignment.package);
        pending.push({
          kind: 'assignment',
          key,
          data: { ...assignment, currency: employee.currency },
        });
      } catch (e) {
        errors.push(
          `Assignments row ${index + 2}: ${e instanceof Error ? e.message : 'Invalid row'}`,
        );
      }
    for (const [index, row] of sheets.Loans.entries())
      try {
        const employee = employees.get(String(row['Employee code']));
        if (!employee) throw new Error('Employee code not found.');
        const key = `opening.${String(row.Reference)}`;
        if (!row.Reference) throw new Error('Reference is required.');
        if (
          (await payrollRepo('loan').findOne({ key }, { session })) ||
          pending.some((p) => p.kind === 'loan' && p.key === key)
        )
          continue;
        const loan = Engine.Loan.parse({
          id: new Types.ObjectId().toString(),
          tenantId: contextIds().tenantId,
          employeeId: employee.id,
          kind: row.Kind,
          principal: Number(row.Principal),
          recovered: Number(row.Recovered || 0),
          installments: Number(row.Installments),
          startPeriod: row['Start period'],
          status: Number(row.Recovered) >= Number(row.Principal) ? 'closed' : 'active',
        });
        if (loan.recovered > loan.principal) throw new Error('Recovered exceeds principal.');
        pending.push({ kind: 'loan', key, data: { ...loan, currency: employee.currency } });
      } catch (e) {
        errors.push(`Loans row ${index + 2}: ${e instanceof Error ? e.message : 'Invalid row'}`);
      }
    let openingChanged = false;
    for (const [index, row] of sheets['Leave balances'].entries())
      try {
        const employee = employees.get(String(row['Employee code']));
        if (!employee) throw new Error('Employee code not found.');
        const entry = Settings.shape.leaveOpening.unwrap().element.parse({
          employeeId: employee.id,
          typeCode: row['Leave code'],
          year: Number(row.Year),
          days: Number(row['Opening days']),
        });
        if (!(await payrollRepo('leaveType').findOne({ key: entry.typeCode }, { session })))
          throw new Error('Leave type not found.');
        const old = config.leaveOpening.find(
          (x) =>
            x.employeeId === entry.employeeId &&
            x.typeCode === entry.typeCode &&
            x.year === entry.year,
        );
        if (old) {
          if (old.days !== entry.days)
            throw new Error('Opening balance already exists with a different value.');
          continue;
        }
        config.leaveOpening.push(entry);
        openingChanged = true;
      } catch (e) {
        errors.push(
          `Leave balances row ${index + 2}: ${e instanceof Error ? e.message : 'Invalid row'}`,
        );
      }
    if (apply && errors.length) throw new Error(errors.slice(0, 20).join('\n'));
    if (apply) {
      for (const entry of pending) await write(entry.kind, entry.data, entry.key, session);
      if (openingChanged)
        await write(
          'settings',
          { ...config, id: String(configRow._id) },
          'settings',
          session,
          configRow.version,
        );
    }
    return {
      applied: apply,
      records: pending.length,
      openingBalances: config.leaveOpening.length,
      errors,
    };
  };
  if (apply) return atomic(work);
  const db = await connectToDatabase();
  return db.connection.transaction(work);
}
export async function staffChoices() {
  await requirePayroll('payroll.read.all');
  return (
    await repository(UserModel)
      .find({ status: 'active', role: { $ne: 'client_contact' } })
      .select('_id name email')
  ).map((u) => ({ value: String(u._id), label: `${u.name} (${u.email})` }));
}
export async function leaveChoices(own = false) {
  await requirePayroll(own ? 'payroll.read.own' : 'payroll.read.all');
  return (await payrollRepo('leaveType').find()).map((row) => {
    const type = Engine.LeaveType.parse(recordData(row));
    return { value: type.code, label: type.name };
  });
}
async function synchronizeRecurring(
  run: RunData,
  config: z.infer<typeof Settings>,
  session: ClientSession,
) {
  const original = structuredClone(run.inputs);
  run.inputs.forEach((input) => {
    input.adjustments = input.adjustments.filter((a) => a.ref?.type !== 'recurring');
  });
  const recurring = await payrollRepo('recurringItem').find(
    { 'data.active': true, 'data.startPeriod': { $lte: run.period } },
    { session },
  );
  for (const row of recurring) {
    const item = SCHEMAS.recurringItem.parse(recordData(row));
    if (item.endPeriod && item.endPeriod < run.period) continue;
    const employee = await payrollRepo('employee').findById(item.employeeId, { session });
    if (!employee || employee.currency !== run.currency) continue;
    const category = await payrollRepo('category').findOne({ key: item.categoryCode }, { session });
    if (!category) throw new Error('Recurring pay category missing.');
    const input =
      run.inputs.find((i) => i.employeeId === item.employeeId) ??
      Engine.RunInput.parse({ employeeId: item.employeeId });
    const fresh = Engine.addRunItem({
      category: Engine.PayItemCategory.parse(recordData(category)),
      amount: item.amount,
      autoAmount: item.amount,
      note: item.note,
      ref: { type: 'recurring', id: item.id },
      actor: { id: item.createdBy, roles: ['hr'] },
      settings: { ...config, itemApprovalLimit: config.approvalLimits[run.currency] },
      monthToDateForCategory: input.adjustments
        .filter((a) => a.code === item.categoryCode)
        .reduce((s, a) => s + a.amount, 0),
    });
    const old = original
      .find((i) => i.employeeId === item.employeeId)
      ?.adjustments.find(
        (a) =>
          a.ref?.type === 'recurring' &&
          a.ref.id === item.id &&
          (a.override?.originalAmount ?? a.amount) === fresh.amount,
      );
    input.adjustments.push(old ?? fresh);
    run.inputs = [...run.inputs.filter((i) => i.employeeId !== item.employeeId), input];
  }
}
export async function skipLoanInstallment(loanId: string, period: string, reason: string) {
  await requirePayroll('payroll.manage');
  Engine.Period.parse(period);
  if (reason.trim().length < 5) throw new Error('Explain why this installment is skipped.');
  await atomic(async (session) => {
    const row = await payrollRepo('loan').findOne(
      { _id: id.parse(loanId), status: 'active' },
      { session },
    );
    if (!row) throw new Error('Active loan not found.');
    if (
      await payrollRepo('run').findOne(
        {
          period: { $gte: period },
          status: { $in: ['paid', 'locked'] },
          'data.payslips.employeeId': row.employeeId,
        },
        { session },
      )
    )
      throw new Error('Cannot skip an installment in a paid period.');
    const loan = Engine.Loan.parse(recordData(row));
    if (!loan.skippedPeriods.includes(period)) loan.skippedPeriods.push(period);
    await write(
      'loan',
      { ...loan, skipReason: reason, currency: row.currency },
      row.key,
      session,
      row.version,
    );
  });
}
export async function removeRunItem(runId: string, employeeId: string, index: number) {
  await requirePayroll('payroll.manage');
  await atomic(async (session) => {
    const row = await payrollRepo('run').findById(id.parse(runId), { session });
    if (!row || !['draft', 'calculated'].includes(row.status))
      throw new Error('Editable run not found.');
    const run = readRun(row),
      input = run.inputs.find((i) => i.employeeId === employeeId),
      item = input?.adjustments[index];
    if (!input || !item) throw new Error('Pay item not found.');
    if (item.source === 'auto')
      throw new Error('Override automatic items with a reason instead of removing them.');
    input.adjustments.splice(index, 1);
    run.status = 'draft';
    run.payslips = [];
    run.approvals = [];
    await write('run', run, row.key, session, row.version);
  });
}
export async function costReport() {
  await requirePayroll('payroll.read.all');
  const runs = (
    await payrollRepo('run')
      .find({ status: { $in: ['paid', 'locked'] } })
      .sort({ period: -1 })
  ).map(readRun);
  const costs = new Map<
    string,
    {
      period: string;
      currency: string;
      department: string;
      gross: number;
      deductions: number;
      net: number;
    }
  >();
  const balances: { period: string; employeeName: string; leaveName: string; days: number }[] = [];
  for (const run of runs)
    for (const slip of run.payslips.filter((p) => !p.hold)) {
      const department =
        run.employeeSnapshots?.find((e) => e.id === slip.employeeId)?.department || 'Unassigned';
      const key = `${run.period}.${run.currency}.${department}`;
      const total = costs.get(key) ?? {
        period: run.period,
        currency: run.currency,
        department,
        gross: 0,
        deductions: 0,
        net: 0,
      };
      total.gross = Engine.fromMinor(Engine.toMinor(total.gross) + Engine.toMinor(slip.gross));
      total.deductions = Engine.fromMinor(
        Engine.toMinor(total.deductions) + Engine.toMinor(slip.totalDeductions),
      );
      total.net = Engine.fromMinor(Engine.toMinor(total.net) + Engine.toMinor(slip.net));
      costs.set(key, total);
      for (const balance of run.summaries?.[slip.employeeId]?.leave.balances ?? [])
        balances.push({
          period: run.period,
          employeeName: slip.employeeName,
          leaveName: balance.name,
          days: balance.balance,
        });
    }
  return { costs: [...costs.values()], balances };
}
