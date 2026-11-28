import { notFound } from 'next/navigation';
import { asUser, requirePermission } from '@/lib/session';
import { Card, CardSection, PageHeader, Notice, Table, Th, Td, Badge } from '@/components/ui';
import { listPayroll, clawbacks, type RunData } from '@/modules/payroll/services/payroll.service';
import { payrollAttachments } from '@/modules/payroll/services/files.service';
import { ITEM_FIELDS } from '../../fields';
import type { Adjustment } from '@coex/shared/payroll/index';
import { PayrollForm } from '../../action-form';
export default async function PayrollRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePermission('payroll.read.all');
  const [runs, employees, categories] = await asUser(actor, () =>
    Promise.all([listPayroll('run'), listPayroll('employee'), listPayroll('category')]),
  );
  const raw = runs.find((run) => run.id === id);
  if (!raw) notFound();
  const run = raw as unknown as RunData;
  const editable = ['draft', 'calculated'].includes(run.status),
    hr = actor.permissions.includes('payroll.manage'),
    approver = actor.permissions.includes('payroll.approve'),
    accounts = actor.permissions.includes('payroll.pay');
  const files = await asUser(actor, () => payrollAttachments(id));
  const suggestions = hr && editable ? await asUser(actor, () => clawbacks(run.period)) : [];
  return (
    <>
      <PageHeader
        title={`Payroll · ${run.period} · ${run.currency}`}
        description="Calculate, review, independently approve, then record payment and lock."
      />
      <Badge>{run.status}</Badge>
      <Notice>
        Zoho account mapping is pending. Payslip layout remains a draft until the final design
        review.
      </Notice>
      <Card>
        <CardSection title="Run controls">
          <div className="flex flex-wrap gap-4">
            {editable && hr && (
              <PayrollForm
                intent="transition"
                hidden={{ runId: id, action: 'calculate' }}
                label="Calculate / recalculate"
              />
            )}
            {run.status === 'calculated' && approver && run.calculatedBy !== actor.id && (
              <PayrollForm
                intent="transition"
                hidden={{ runId: id, action: 'approve' }}
                label="Approve payroll"
              />
            )}
            {run.status === 'approved' && approver && (
              <PayrollForm
                intent="transition"
                hidden={{ runId: id, action: 'reopen' }}
                label="Reopen with reason"
                fields={[
                  { key: 'reason', label: 'Reason (at least 10 characters)', required: true },
                ]}
              />
            )}
            {run.status === 'approved' && accounts && (
              <PayrollForm
                intent="transition"
                hidden={{ runId: id, action: 'mark_paid' }}
                label="Mark paid"
                fields={[{ key: 'paymentRef', label: 'Payment reference', required: true }]}
              />
            )}
            {run.status === 'paid' && accounts && (
              <PayrollForm
                intent="transition"
                hidden={{ runId: id, action: 'lock' }}
                label="Lock payroll"
              />
            )}
            {editable && hr && (
              <PayrollForm
                intent="transition"
                hidden={{ runId: id, action: 'cancel' }}
                label="Cancel run"
                fields={[
                  {
                    key: 'reason',
                    label: 'Cancellation reason (at least 10 characters)',
                    required: true,
                  },
                ]}
              />
            )}
          </div>
          {['approved', 'paid', 'locked'].includes(run.status) && accounts && (
            <p className="mt-4 flex gap-4">
              <a className="underline" href={`/api/payroll/runs/${id}/export?format=register`}>
                Payroll register CSV
              </a>
              <a className="underline" href={`/api/payroll/runs/${id}/export?format=bank`}>
                Bank transfer CSV
              </a>
            </p>
          )}
        </CardSection>
      </Card>
      <Card>
        <CardSection title="Employee inputs">
          <div className="space-y-4">
            {employees
              .filter((e) => e.currency === run.currency)
              .map((employee) => {
                const employeeId = String(employee.id),
                  input = run.inputs?.find((i) => i.employeeId === employeeId),
                  slip = run.payslips.find((p) => p.employeeId === employeeId);
                return (
                  <div
                    className="rounded-xl border border-[var(--color-line)] p-4"
                    key={employeeId}
                  >
                    <h2 className="mb-3 font-semibold">
                      {String(employee.code)} · {String(employee.name)}
                    </h2>
                    {slip && (
                      <p className="mb-3 text-sm">
                        Gross {run.currency} {slip.gross.toFixed(2)} · Deductions{' '}
                        {slip.totalDeductions.toFixed(2)} · Net {slip.net.toFixed(2)}
                        {slip.hold ? ' · ON HOLD' : ''}
                      </p>
                    )}
                    {slip?.warnings.map((warning, index) => (
                      <p key={index} className="text-sm text-[var(--color-ink-muted)]">
                        {warning}
                      </p>
                    ))}
                    {editable && hr && (
                      <PayrollForm
                        intent="input"
                        hidden={{ runId: id, employeeId }}
                        values={(input ?? {}) as unknown as Record<string, unknown>}
                        label="Save inputs"
                        fields={[
                          {
                            key: 'overtimeHours',
                            label: 'Overtime hours',
                            type: 'number',
                            value: 0,
                          },
                          {
                            key: 'unpaidDaysOverride',
                            label: 'Unpaid days override (leave blank to use approved leave)',
                            type: 'number',
                          },
                          { key: 'hold', label: 'Hold this employee’s payment', type: 'checkbox' },
                        ]}
                      />
                    )}
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {(['earning', 'deduction'] as const).map((type) => (
                        <div key={type}>
                          <h3 className="mb-2 text-sm font-semibold">
                            {type === 'earning' ? 'Additions' : 'Deductions'}
                          </h3>
                          {(input?.adjustments ?? []).map((item: Adjustment, index: number) =>
                            item.type === type ? (
                              <div
                                className="mb-2 rounded border border-[var(--color-line)] p-2 text-sm"
                                key={index}
                              >
                                <span>
                                  {item.name} · {run.currency} {item.amount.toFixed(2)}
                                </span>
                                {item.note && <p>{item.note}</p>}
                                {editable && hr && (
                                  <details>
                                    <summary className="cursor-pointer underline">
                                      Edit item
                                    </summary>
                                    <PayrollForm
                                      intent="item"
                                      hidden={{
                                        runId: id,
                                        employeeId,
                                        index: String(index),
                                        categoryCode: item.code,
                                      }}
                                      values={{ amount: item.amount, note: item.note }}
                                      fields={ITEM_FIELDS}
                                    />
                                    {item.source !== 'auto' && (
                                      <PayrollForm
                                        intent="removeItem"
                                        hidden={{ runId: id, employeeId, index: String(index) }}
                                        label="Remove item"
                                      />
                                    )}
                                  </details>
                                )}
                                {item.approval?.required && !item.approval.approvedBy && (
                                  <>
                                    <p>Approval required</p>
                                    {approver && editable && (
                                      <PayrollForm
                                        intent="approveItem"
                                        hidden={{ runId: id, employeeId, index: String(index) }}
                                        label="Approve item"
                                      />
                                    )}
                                  </>
                                )}
                              </div>
                            ) : null,
                          )}
                          {editable && hr && (
                            <details>
                              <summary className="cursor-pointer text-sm underline">
                                + Add {type === 'earning' ? 'addition' : 'deduction'}
                              </summary>
                              <PayrollForm
                                intent="item"
                                hidden={{ runId: id, employeeId }}
                                fields={[
                                  {
                                    key: 'categoryCode',
                                    label: 'Category',
                                    type: 'select',
                                    required: true,
                                    options: categories
                                      .filter((c) => c.type === type && c.active !== false)
                                      .map((c) => ({
                                        value: String(c.code),
                                        label: String(c.name),
                                      })),
                                  },
                                  ...ITEM_FIELDS,
                                ]}
                              />
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                    {slip && (
                      <p className="mt-3">
                        <a
                          className="text-sm underline"
                          href={`/api/payroll/runs/${id}/payslip?employeeId=${employeeId}`}
                        >
                          Draft payslip PDF
                        </a>{' '}
                        ·{' '}
                        <a
                          className="text-sm underline"
                          href={`/api/payroll/runs/${id}/payslip?employeeId=${employeeId}&bank=true`}
                        >
                          Bank copy (page 1)
                        </a>
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        </CardSection>
      </Card>
      {suggestions.length > 0 && (
        <Card>
          <CardSection title="Clawbacks requiring HR confirmation">
            {suggestions.map((s) => (
              <PayrollForm
                key={`${s.contractId}.${s.employeeId}`}
                intent="clawback"
                hidden={{ runId: id, contractId: s.contractId, employeeId: s.employeeId }}
                label={`Confirm clawback ${run.currency} ${s.item.amount.toFixed(2)}`}
                fields={[{ key: 'reason', label: s.item.note ?? 'Reason', required: true }]}
              />
            ))}
          </CardSection>
        </Card>
      )}
      <Card>
        <CardSection title="Supporting files">
          {files.map((file) => (
            <p key={file.id}>
              <a className="underline" href={`/api/payroll/files/${file.id}`}>
                {file.name}
              </a>
            </p>
          ))}
          {hr && editable && (
            <PayrollForm
              intent="upload"
              kind="run"
              hidden={{ recordId: id }}
              label="Upload supporting file"
              fields={[
                {
                  key: 'attachment',
                  label: 'PDF or image (up to 3 MB)',
                  type: 'file',
                  accept: '.pdf,.png,.jpg,.jpeg,.webp',
                  required: true,
                },
              ]}
            />
          )}
        </CardSection>
      </Card>
      <Card>
        <CardSection title="Run history">
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Action</Th>
                <Th>From → To</Th>
                <Th>Reason</Th>
              </tr>
            </thead>
            <tbody>
              {run.events.map((event, index) => (
                <tr key={index}>
                  <Td>{event.at}</Td>
                  <Td>{event.action}</Td>
                  <Td>
                    {event.from} → {event.to}
                  </Td>
                  <Td>{event.reason ?? '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardSection>
      </Card>
    </>
  );
}
