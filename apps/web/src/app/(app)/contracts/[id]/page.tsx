import { notFound } from 'next/navigation';
import { asUser, requirePermission } from '@/lib/session';
import { getContract } from '@/modules/crm/services/contract.service';
import { billingSchedule, periodContaining, todayKey } from '@coex/shared/crm/contract-status';
import { fromMinorUnits } from '@/modules/crm/services/product.service';
import { loggedTicketMinutesForOrganisation } from '@/modules/time/services/time.service';
import { formatMinutes } from '@coex/shared/time/week';
import { FactBadge, FactRow } from '@/components/ui/fact-badge';
import { Badge, Card, CardSection, Notice, PageHeader, Table, Td, Th } from '@/components/ui';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { setPeriodInvoicedAction } from '../actions';

export const metadata = { title: 'Contract · COEX' };

const STATUS_TONE = {
  draft: 'neutral',
  active: 'ok',
  expiring: 'warn',
  expired: 'alert',
  renewed: 'neutral',
  cancelled: 'neutral',
} as const;

const STATUS_LABEL = {
  draft: 'Draft',
  active: 'Active',
  expiring: 'Expiring',
  expired: 'Expired',
  renewed: 'Renewed',
  cancelled: 'Cancelled',
} as const;

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePermission('contract.read');
  const editable = actor.permissions.includes('contract.manage');

  const contract = await asUser(actor, () => getContract(id));
  if (!contract) notFound();

  const schedule = billingSchedule(contract.startDate, contract.endDate, contract.billingFrequency);
  const current = periodContaining(schedule, todayKey());

  // Time lives in another module, so the page brings the two together rather than either module
  // importing the other.
  const usedMinutes =
    contract.supportHoursEnabled && current
      ? await asUser(actor, () =>
          loggedTicketMinutesForOrganisation(
            contract.organisationId,
            current.startDate,
            current.endDate,
          ),
        )
      : null;
  const includedMinutes = Math.round((contract.includedHoursPerPeriod ?? 0) * 60);

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumb
        trail={[{ label: 'Contracts', href: '/contracts' }, { label: contract.number }]}
      />

      <div className="mt-2">
        <PageHeader
          title={contract.title}
          description={`${contract.organisationName} · ${contract.startDate} to ${contract.endDate}`}
          action={
            <Badge tone={STATUS_TONE[contract.status]}>{STATUS_LABEL[contract.status]}</Badge>
          }
        />
      </div>

      <div className="space-y-4">
        <Card>
          <CardSection>
            <FactRow>
              <FactBadge icon="money" label="Amount per billing period">
                {contract.currency} {fromMinorUnits(contract.valueMinorUnits)}
              </FactBadge>
              <FactBadge icon="receipt" label="Zoho Books reference">
                {contract.zohoReference ?? 'No Zoho reference'}
              </FactBadge>
              {contract.documentUrl ? (
                <FactBadge icon="file" label="Contract document" href={contract.documentUrl}>
                  Open in Microsoft 365
                </FactBadge>
              ) : (
                <FactBadge icon="file" label="Contract document">
                  No document linked
                </FactBadge>
              )}
              {usedMinutes !== null ? (
                <FactBadge
                  icon="clock"
                  label={`Support hours this billing period${
                    current ? ` (${current.startDate} to ${current.endDate})` : ''
                  }`}
                  tone={usedMinutes > includedMinutes ? 'warn' : undefined}
                >
                  {formatMinutes(usedMinutes)} of {formatMinutes(includedMinutes)} support hours
                </FactBadge>
              ) : null}
            </FactRow>
            {contract.notes ? (
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{contract.notes}</p>
            ) : null}
            {usedMinutes !== null && usedMinutes > includedMinutes ? (
              <div className="mt-2">
                <Notice tone="warn">
                  The included support hours have been used up. Work continues; this is a warning
                  only.
                </Notice>
              </div>
            ) : null}
          </CardSection>
        </Card>

        <Card>
          <CardSection title="Billing schedule">
            <p className="mb-2 text-xs text-[var(--color-ink-subtle)]">
              A reminder for finance. Invoices are raised and paid in Zoho Books; tick a period once
              it has been invoiced there.
            </p>
            <Table>
              <thead>
                <tr>
                  <Th>Period</Th>
                  <Th>Invoice due</Th>
                  <Th>Amount</Th>
                  <Th>Invoiced in Zoho</Th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((period) => {
                  const invoiced = contract.invoicedPeriods.includes(period.index);
                  // A draft is not being billed yet, so only a contract in force can be behind.
                  const overdue =
                    contract.storedStatus === 'active' && !invoiced && period.dueDate < todayKey();

                  return (
                    <tr key={period.index}>
                      <Td>
                        {period.startDate} to {period.endDate}
                      </Td>
                      <Td className={overdue ? 'text-[var(--color-status-alert)]' : undefined}>
                        {period.dueDate}
                        {overdue ? ' (not ticked)' : ''}
                      </Td>
                      <Td>
                        {contract.currency} {fromMinorUnits(contract.valueMinorUnits)}
                      </Td>
                      <Td>
                        {editable ? (
                          <form action={setPeriodInvoicedAction}>
                            <input type="hidden" name="id" value={contract.id} />
                            <input type="hidden" name="period" value={period.index} />
                            <input type="hidden" name="invoiced" value={invoiced ? 'no' : 'yes'} />
                            <button
                              type="submit"
                              className="text-sm underline"
                              aria-label={
                                invoiced ? 'Mark as not invoiced' : 'Mark as invoiced in Zoho'
                              }
                            >
                              {invoiced ? 'Invoiced' : 'Mark invoiced'}
                            </button>
                          </form>
                        ) : invoiced ? (
                          'Invoiced'
                        ) : (
                          '—'
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </CardSection>
        </Card>
      </div>
    </div>
  );
}
