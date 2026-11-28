import Link from 'next/link';
import { asUser, requireStaffUser } from '@/lib/session';
import { moduleAvailable } from '@/modules/core/services/module-access.service';
import { listPayroll, payrollStaff } from '@/modules/payroll/services/payroll.service';
import { Card, CardSection, PageHeader, Notice } from '@/components/ui';
import { PayrollForm } from './action-form';
export default async function PayrollPage() {
  const actor = await requireStaffUser();
  const enabled = await asUser(actor, () => moduleAvailable('payroll'));
  if (!enabled) {
    const staff = actor.role === 'platform_admin' ? await asUser(actor, payrollStaff) : [];
    const options = staff.map((u) => ({ value: String(u._id), label: `${u.name} (${u.email})` }));
    return (
      <>
        <PageHeader
          title="Payroll setup"
          description="Payroll is enabled explicitly for each workspace."
        />
        <Card>
          <CardSection title="Enable DigiSol payroll">
            <Notice>
              Salary access is granted separately to HR, approvers and Accounts. Zoho account
              mapping remains pending.
            </Notice>
            {actor.role === 'platform_admin' ? (
              <PayrollForm
                intent="initialize"
                label="Enable payroll for DigiSol"
                fields={[
                  {
                    key: 'hrIds',
                    label: 'HR users',
                    type: 'multiple',
                    options,
                    value: [],
                  },
                  {
                    key: 'approverIds',
                    label: 'Payroll approvers',
                    type: 'multiple',
                    options,
                    required: true,
                    value: [],
                  },
                  { key: 'accountsIds', label: 'Accounts users', type: 'multiple', options },
                ]}
              />
            ) : (
              <p>Ask the platform owner to enable Payroll.</p>
            )}
          </CardSection>
        </Card>
      </>
    );
  }
  if (!actor.permissions.includes('payroll.read.all'))
    return (
      <>
        <PageHeader title="Payroll" />
        <Link className="underline" href="/payroll/my-pay">
          Open My pay
        </Link>
      </>
    );
  const [employees, runs] = await asUser(actor, () =>
    Promise.all([listPayroll('employee'), listPayroll('run')]),
  );
  return (
    <>
      <PageHeader
        title="Payroll"
        description="Monthly pay, employee requests and payment controls."
      />
      <Notice>Zoho account mapping is pending. Journal export remains unavailable.</Notice>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Employees', employees.length, 'employees'],
          [
            'Open runs',
            runs.filter((r) => !['paid', 'locked', 'cancelled'].includes(String(r.status))).length,
            'runs',
          ],
          [
            'Paid / locked runs',
            runs.filter((r) => ['paid', 'locked'].includes(String(r.status))).length,
            'reports',
          ],
        ].map(([label, value, path]) => (
          <Card key={String(path)}>
            <CardSection title={String(label)}>
              <Link href={`/payroll/${path}`} className="text-3xl font-semibold">
                {value}
              </Link>
            </CardSection>
          </Card>
        ))}
      </div>
      <Card>
        <CardSection title="Monthly workflow">
          <p>
            Review employees and effective salary assignments, approve leave and expenses, enter
            overtime and pay items, calculate, obtain an independent approval, record payment, then
            lock the run. Approved payslips retain their calculated snapshot.
          </p>
        </CardSection>
      </Card>
    </>
  );
}
