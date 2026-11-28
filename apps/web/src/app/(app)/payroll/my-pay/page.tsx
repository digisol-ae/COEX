import { asUser, requirePermission } from '@/lib/session';
import { Card, CardSection, PageHeader, Notice } from '@/components/ui';
import {
  listPayroll,
  leaveChoices,
  monthSummary,
} from '@/modules/payroll/services/payroll.service';
import { PayrollForm } from '../action-form';
import { payrollAttachments } from '@/modules/payroll/services/files.service';
import { FIELDS } from '../fields';
import type { Payslip } from '@coex/shared/payroll/index';
export default async function MyPayPage() {
  const actor = await requirePermission('payroll.read.own');
  const [employees, runs, leave, loans, expenses, types] = await asUser(actor, () =>
    Promise.all([
      listPayroll('employee', true),
      listPayroll('run', true),
      listPayroll('leave', true),
      listPayroll('loan', true),
      listPayroll('reimbursement', true),
      leaveChoices(true),
    ]),
  );
  const employee = employees[0];
  if (!employee)
    return (
      <>
        <PageHeader title="My pay" />
        <Notice>
          Your Worktello account has not yet been linked to an employee profile. Ask HR.
        </Notice>
      </>
    );
  const receipts = await asUser(actor, () =>
    Promise.all(expenses.map((expense) => payrollAttachments(String(expense.id), true))),
  );
  const currentPeriod = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
  })
    .format(new Date())
    .slice(0, 7);
  const summary = await asUser(actor, () => monthSummary(String(employee.id), currentPeriod, true));
  return (
    <>
      <PageHeader title="My pay" description={`${employee.name} · ${employee.code}`} />
      <Card>
        <CardSection title="Payslips">
          {!runs.length && <p>No paid payslips yet.</p>}
          {runs.map((run) => {
            const slip = run.payslip as Payslip;
            return (
              <div className="my-3 flex flex-wrap justify-between gap-3" key={String(run.id)}>
                <span>
                  {String(run.period)} · {slip.currency} {slip.net.toFixed(2)}
                </span>
                <div className="flex gap-3">
                  <a
                    className="underline"
                    href={`/api/payroll/runs/${run.id}/payslip?employeeId=${employee.id}&own=true`}
                  >
                    Payslip
                  </a>
                  <a
                    className="underline"
                    href={`/api/payroll/runs/${run.id}/payslip?employeeId=${employee.id}&own=true&bank=true`}
                  >
                    Bank copy
                  </a>
                </div>
              </div>
            );
          })}
        </CardSection>
      </Card>
      <Card>
        <CardSection title={`Month at a glance · ${currentPeriod}`}>
          <p>
            Logged time: {summary.time.taskHours} task hours + {summary.time.ticketHours} ticket
            hours. Tasks closed: {summary.tasks.closed}. Tickets closed: {summary.tickets.closed}.
          </p>
          <p>
            Leave taken:{' '}
            {summary.leave.taken.map((t) => `${t.name}: ${t.days} days`).join(', ') || 'None'}.
          </p>
          {summary.leave.balances.map((b) => (
            <p key={b.code}>
              {b.name} balance: {b.balance} days
            </p>
          ))}
        </CardSection>
      </Card>
      <div className="grid gap-5 lg:grid-cols-3">
        {(['leave', 'loan', 'reimbursement'] as const).map((kind) => (
          <Card key={kind}>
            <CardSection
              title={
                kind === 'leave'
                  ? 'Request leave'
                  : kind === 'loan'
                    ? 'Request loan / advance'
                    : 'Submit an expense'
              }
            >
              <PayrollForm
                intent="save"
                kind={kind}
                hidden={{ self: 'true' }}
                fields={FIELDS[kind]
                  .filter((f) => f.key !== 'employeeId')
                  .map((f) => (f.key === 'typeCode' ? { ...f, options: types } : f))}
              />
            </CardSection>
          </Card>
        ))}
      </div>
      <Card>
        <CardSection title="Expense receipts">
          {expenses.map((expense, index) => (
            <div className="my-3" key={String(expense.id)}>
              <p>
                {String(expense.category)} · {String(expense.date)} · {String(expense.status)}
              </p>
              {receipts[index].map((file) => (
                <a key={file.id} className="mr-3 underline" href={`/api/payroll/files/${file.id}`}>
                  {file.name}
                </a>
              ))}
              {expense.status === 'submitted' && (
                <PayrollForm
                  intent="upload"
                  kind="reimbursement"
                  hidden={{ recordId: String(expense.id) }}
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
          ))}
        </CardSection>
      </Card>
      <Card>
        <CardSection title="My requests">
          {[...leave, ...loans, ...expenses].map((row) => (
            <p className="my-2 text-sm" key={String(row.id)}>
              {String(row.typeCode ?? row.kind ?? row.category)} ·{' '}
              {String(row.from ?? row.startPeriod ?? row.date)} ·{' '}
              {row.amount != null
                ? `${employee.currency} ${row.amount}`
                : row.principal != null
                  ? `${employee.currency} ${row.principal}`
                  : ''}{' '}
              · {String(row.status)}
            </p>
          ))}
        </CardSection>
      </Card>
    </>
  );
}
