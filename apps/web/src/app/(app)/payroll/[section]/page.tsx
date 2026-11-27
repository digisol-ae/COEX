import Link from 'next/link';
import { notFound } from 'next/navigation';
import { asUser, requirePermission } from '@/lib/session';
import { Card, CardSection, PageHeader, Notice, Table, Th, Td, Badge } from '@/components/ui';
import * as Service from '@/modules/payroll/services/payroll.service';
import { payrollAttachments } from '@/modules/payroll/services/files.service';
import type { RecordKind } from '@coex/shared/payroll/models/record.model';
import { PayrollForm } from '../action-form';
import { FIELDS } from '../fields';
const SECTIONS: Record<string, { kind: RecordKind; title: string }> = {
  recurring: { kind: 'recurringItem', title: 'Recurring pay items' },
  employees: { kind: 'employee', title: 'Employees' },
  assignments: { kind: 'assignment', title: 'Salary history' },
  structures: { kind: 'structure', title: 'Salary structures' },
  leave: { kind: 'leave', title: 'Leave requests' },
  loans: { kind: 'loan', title: 'Loans and advances' },
  reimbursements: { kind: 'reimbursement', title: 'Reimbursements' },
  categories: { kind: 'category', title: 'Pay items' },
  settings: { kind: 'settings', title: 'Payroll settings' },
  commissions: { kind: 'commissionPlan', title: 'Commissions' },
};
export default async function PayrollSection({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const actor = await requirePermission('payroll.read.all');
  if (section === 'runs') {
    const rows = await asUser(actor, () => Service.listPayroll('run'));
    return (
      <>
        <PageHeader title="Payroll runs" />
        {actor.permissions.includes('payroll.manage') && (
          <Card>
            <CardSection title="Create a run">
              <PayrollForm
                intent="createRun"
                label="Create run"
                fields={[
                  { key: 'period', label: 'Pay month', type: 'month', required: true },
                  {
                    key: 'currency',
                    label: 'Currency',
                    type: 'select',
                    required: true,
                    options: [
                      { value: 'AED', label: 'AED' },
                      { value: 'PKR', label: 'PKR' },
                    ],
                  },
                ]}
              />
            </CardSection>
          </Card>
        )}
        <Card>
          <Table>
            <thead>
              <tr>
                <Th>Period</Th>
                <Th>Currency</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.id)}>
                  <Td>
                    <Link className="underline" href={`/payroll/runs/${row.id}`}>
                      {String(row.period)}
                    </Link>
                  </Td>
                  <Td>{String(row.currency)}</Td>
                  <Td>
                    <Badge>{String(row.status)}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </>
    );
  }
  if (section === 'import')
    return (
      <>
        <PageHeader
          title="Import payroll opening data"
          description="Use the Excel template for employees, salary assignments, opening leave and loans."
        />
        <Card>
          <CardSection title="Validate before importing">
            <a download className="underline" href="/api/payroll/template">
              Download Excel template
            </a>
            <p className="my-3 text-sm">
              Enter dates as YYYY-MM-DD and monetary amounts in the employee currency. Matching
              employee codes, assignment dates and loan references are not duplicated. Preview
              first; the import is applied only when every row validates.
            </p>
            <PayrollForm
              intent="import"
              label="Validate / import"
              fields={[
                { key: 'workbook', label: 'Excel workbook', type: 'file', required: true },
                {
                  key: 'apply',
                  label: 'Apply validated import (leave unchecked for preview)',
                  type: 'checkbox',
                },
              ]}
            />
          </CardSection>
        </Card>
      </>
    );
  if (section === 'reports') {
    const [runs, loans, report] = await asUser(actor, () =>
      Promise.all([Service.listPayroll('run'), Service.listPayroll('loan'), Service.costReport()]),
    );
    return (
      <>
        <PageHeader title="Payroll reports" />
        <Card>
          <CardSection title="Paid payroll cost by department">
            <Table>
              <thead>
                <tr>
                  <Th>Period</Th>
                  <Th>Department</Th>
                  <Th>Currency</Th>
                  <Th>Gross</Th>
                  <Th>Deductions</Th>
                  <Th>Net</Th>
                </tr>
              </thead>
              <tbody>
                {report.costs.map((cost, index) => (
                  <tr key={index}>
                    <Td>{cost.period}</Td>
                    <Td>{cost.department}</Td>
                    <Td>{cost.currency}</Td>
                    <Td>{cost.gross.toFixed(2)}</Td>
                    <Td>{cost.deductions.toFixed(2)}</Td>
                    <Td>{cost.net.toFixed(2)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardSection>
        </Card>
        <Card>
          <CardSection title="Leave balances at paid month end">
            <Table>
              <thead>
                <tr>
                  <Th>Period</Th>
                  <Th>Employee</Th>
                  <Th>Leave</Th>
                  <Th>Balance (days)</Th>
                </tr>
              </thead>
              <tbody>
                {report.balances.map((balance, index) => (
                  <tr key={index}>
                    <Td>{balance.period}</Td>
                    <Td>{balance.employeeName}</Td>
                    <Td>{balance.leaveName}</Td>
                    <Td>{balance.days}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardSection>
        </Card>
        <Card>
          <CardSection title="Payroll register">
            <Table>
              <thead>
                <tr>
                  <Th>Period</Th>
                  <Th>Currency</Th>
                  <Th>Status</Th>
                  <Th>Download</Th>
                </tr>
              </thead>
              <tbody>
                {runs
                  .filter((r) => ['approved', 'paid', 'locked'].includes(String(r.status)))
                  .map((r) => (
                    <tr key={String(r.id)}>
                      <Td>{String(r.period)}</Td>
                      <Td>{String(r.currency)}</Td>
                      <Td>{String(r.status)}</Td>
                      <Td>
                        {actor.permissions.includes('payroll.pay') && (
                          <a
                            className="underline"
                            href={`/api/payroll/runs/${r.id}/export?format=register`}
                          >
                            CSV register
                          </a>
                        )}
                      </Td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </CardSection>
        </Card>
        <Card>
          <CardSection title="Outstanding loans">
            <Table>
              <thead>
                <tr>
                  <Th>Employee</Th>
                  <Th>Currency</Th>
                  <Th>Principal</Th>
                  <Th>Recovered</Th>
                  <Th>Balance</Th>
                </tr>
              </thead>
              <tbody>
                {loans.map((l) => (
                  <tr key={String(l.id)}>
                    <Td>{String(l.employeeId)}</Td>
                    <Td>{String(l.currency ?? '')}</Td>
                    <Td>{String(l.principal)}</Td>
                    <Td>{String(l.recovered)}</Td>
                    <Td>{(Number(l.principal) - Number(l.recovered)).toFixed(2)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardSection>
        </Card>
      </>
    );
  }
  const info = SECTIONS[section];
  if (!info) notFound();
  const [rows, employees, structures, staff, leaveTypes] = await asUser(actor, () =>
    Promise.all([
      Service.listPayroll(info.kind),
      Service.listPayroll('employee'),
      Service.listPayroll('structure'),
      Service.staffChoices(),
      Service.leaveChoices(),
    ]),
  );
  const employeeOptions = employees.map((e) => ({
    value: String(e.id),
    label: `${e.code} · ${e.name}`,
  }));
  const payCategories =
    info.kind === 'recurringItem' ? await asUser(actor, () => Service.listPayroll('category')) : [];
  const fields = (FIELDS[info.kind] ?? []).map((field) => ({
    ...field,
    ...(field.key === 'employeeId'
      ? { options: employeeOptions }
      : field.key === 'structureId'
        ? {
            options: structures
              .filter((s) => s.status === 'published')
              .map((s) => ({ value: String(s.id), label: String(s.name) })),
          }
        : field.key === 'userId' || field.key === 'approverUserIds'
          ? { options: staff }
          : field.key === 'categoryCode'
            ? {
                options: payCategories
                  .filter((c) => c.active !== false)
                  .map((c) => ({ value: String(c.code), label: String(c.name) })),
              }
            : field.key === 'typeCode'
              ? { options: leaveTypes }
              : {}),
  }));
  const fileRows =
    info.kind === 'reimbursement'
      ? await asUser(actor, () =>
          Promise.all(rows.map((row) => payrollAttachments(String(row.id)))),
        )
      : [];
  const canEdit = actor.permissions.includes(
    ['settings', 'category'].includes(info.kind) ? 'payroll.settings' : 'payroll.manage',
  );
  const employeeName = (row: Record<string, unknown>) =>
    employees.find((e) => e.id === row.employeeId)?.name ?? row.employeeId;
  if (section === 'settings') {
    const config = rows[0] ?? {};
    const limits = config.approvalLimits as Record<string, number> | undefined;
    return (
      <>
        <PageHeader title={info.title} />
        <Notice>
          Zoho account confirmation remains pending. No journal is posted or exported.
        </Notice>
        {canEdit ? (
          <Card>
            <CardSection title="Calculation and approval policy">
              <PayrollForm
                intent="save"
                kind="settings"
                fields={fields}
                values={{ ...config, approvalAED: limits?.AED, approvalPKR: limits?.PKR }}
              />
            </CardSection>
          </Card>
        ) : (
          <p>Payroll settings require a separate settings permission.</p>
        )}
      </>
    );
  }
  if (section === 'commissions') {
    const contracts = await asUser(actor, Service.contractChoices);
    const options = contracts.map((c) => ({
      value: c.id,
      label: `${c.number} · ${c.currency}${!c.salesOwnerId ? ' · sales owner needed' : ''}`,
    }));
    return (
      <>
        <PageHeader
          title="Commission plans and receipts"
          description="Commission uses the recurring value over the full contract term, excluding setup and training. It accrues proportionally when payments are received."
        />
        {canEdit && (
          <Card>
            <CardSection title="Commission plan">
              <PayrollForm intent="save" kind="commissionPlan" fields={fields} />
            </CardSection>
            <CardSection title="Contract sales owner and manual rate">
              <PayrollForm
                intent="contract"
                fields={[
                  { key: 'contractId', label: 'Contract', type: 'select', options, required: true },
                  {
                    key: 'salesOwnerId',
                    label: 'Sales owner',
                    type: 'select',
                    options: staff,
                    required: true,
                  },
                  {
                    key: 'commissionRate',
                    label: 'Manual rate (%) — required for renewals',
                    type: 'number',
                  },
                  {
                    key: 'commissionSignedAt',
                    label: 'Signed date (legacy contracts without a Worktello signature record)',
                    type: 'date',
                  },
                  {
                    key: 'cancelledAt',
                    label: 'Actual cancellation date (cancelled contracts only)',
                    type: 'date',
                  },
                ]}
              />
            </CardSection>
          </Card>
        )}
        {actor.permissions.includes('payroll.pay') && (
          <Card>
            <CardSection title="Record payment received">
              <PayrollForm
                intent="payment"
                fields={[
                  { key: 'contractId', label: 'Contract', type: 'select', options, required: true },
                  { key: 'amount', label: 'Received amount', type: 'number', required: true },
                  {
                    key: 'currency',
                    label: 'Currency',
                    type: 'select',
                    options: [
                      { value: 'AED', label: 'AED' },
                      { value: 'PKR', label: 'PKR' },
                    ],
                    required: true,
                  },
                  { key: 'receivedAt', label: 'Received date', type: 'date', required: true },
                  { key: 'reference', label: 'Unique payment reference', required: true },
                ]}
              />
            </CardSection>
          </Card>
        )}
        <Card>
          <CardSection title="Current plans">
            {canEdit &&
              rows.map((row) => (
                <details key={`edit-${row.id}`} className="my-3">
                  <summary className="cursor-pointer underline">
                    Edit {String(employeeName(row))} commission plan
                  </summary>
                  <PayrollForm intent="save" kind="commissionPlan" fields={fields} values={row} />
                </details>
              ))}
            {rows.map((row) => (
              <p key={String(row.id)}>
                {String(employeeName(row))} · {String(row.rate)}% · from {String(row.effectiveFrom)}
              </p>
            ))}
          </CardSection>
        </Card>
      </>
    );
  }
  return (
    <>
      <PageHeader title={info.title} />
      {section === 'structures' && (
        <Notice>
          Percentages split the monthly package. Other allowance receives the balance. Publish a new
          structure version when the split changes.
        </Notice>
      )}
      {canEdit && (
        <Card>
          <CardSection
            title={
              info.kind === 'assignment'
                ? 'Add an effective salary assignment'
                : `Add ${info.title.toLowerCase()}`
            }
          >
            <PayrollForm intent="save" kind={info.kind} fields={fields} />
          </CardSection>
        </Card>
      )}
      <Card>
        <CardSection title="Records">
          <div className="space-y-3">
            {!rows.length && <p>No records yet.</p>}
            {rows.map((row, rowIndex) => (
              <div
                className="rounded-lg border border-[var(--color-line)] p-3"
                key={String(row.id)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{String(row.name ?? employeeName(row) ?? row.code)}</strong>
                  <Badge>
                    {String(row.status ?? (row.active === false ? 'inactive' : 'active'))}
                  </Badge>
                </div>
                <p className="my-2 text-sm text-[var(--color-ink-muted)]">
                  {[
                    row.code,
                    row.effectiveFrom,
                    row.from && `${row.from} → ${row.to}`,
                    row.currency,
                    row.package != null && `Package ${row.package}`,
                    row.principal != null &&
                      `Principal ${row.principal} · recovered ${row.recovered}`,
                    row.amount != null && `Amount ${row.amount}`,
                    row.category,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {row.reason != null && <p className="text-sm">{String(row.reason)}</p>}
                {info.kind === 'reimbursement' && (
                  <div className="my-3">
                    {fileRows[rowIndex]?.map((file) => (
                      <a
                        className="mr-3 text-sm underline"
                        key={file.id}
                        href={`/api/payroll/files/${file.id}`}
                      >
                        {file.name}
                      </a>
                    ))}
                    {canEdit && row.status === 'submitted' && (
                      <PayrollForm
                        intent="upload"
                        kind="reimbursement"
                        hidden={{ recordId: String(row.id) }}
                        label="Add receipt"
                        fields={[
                          {
                            key: 'attachment',
                            label: 'Receipt PDF or image (up to 3 MB)',
                            type: 'file',
                            accept: '.pdf,.png,.jpg,.jpeg,.webp',
                            required: true,
                          },
                        ]}
                      />
                    )}
                  </div>
                )}
                {canEdit && info.kind === 'loan' && row.status === 'active' && (
                  <details>
                    <summary className="cursor-pointer text-sm underline">
                      Skip an installment
                    </summary>
                    <PayrollForm
                      intent="skipLoan"
                      hidden={{ id: String(row.id) }}
                      label="Skip installment"
                      fields={[
                        {
                          key: 'period',
                          label: 'Recovery month to skip',
                          type: 'month',
                          required: true,
                        },
                        { key: 'reason', label: 'Reason', required: true },
                      ]}
                    />
                  </details>
                )}
                {canEdit &&
                  ['employee', 'recurringItem', 'category', 'leaveType'].includes(info.kind) && (
                    <details>
                      <summary className="cursor-pointer text-sm underline">Edit record</summary>
                      <PayrollForm intent="save" kind={info.kind} fields={fields} values={row} />
                    </details>
                  )}
                {canEdit &&
                  ['leave', 'loan', 'reimbursement'].includes(info.kind) &&
                  ['pending', 'requested', 'submitted'].includes(String(row.status)) && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      <PayrollForm
                        intent="decide"
                        kind={info.kind}
                        hidden={{ id: String(row.id), approve: 'yes' }}
                        label="Approve"
                        fields={
                          info.kind === 'reimbursement'
                            ? [
                                {
                                  key: 'payPeriod',
                                  label: 'Pay in month',
                                  type: 'month',
                                  required: true,
                                },
                              ]
                            : []
                        }
                      />
                      <PayrollForm
                        intent="decide"
                        kind={info.kind}
                        hidden={{ id: String(row.id), approve: 'no' }}
                        label="Reject"
                      />
                    </div>
                  )}
              </div>
            ))}
          </div>
        </CardSection>
      </Card>
      {section === 'leave' && actor.permissions.includes('payroll.manage') && (
        <Card>
          <CardSection title="Add leave type">
            <PayrollForm intent="save" kind="leaveType" fields={FIELDS.leaveType} />
          </CardSection>
        </Card>
      )}
    </>
  );
}
