import Link from 'next/link';
import { asUser, requirePermission } from '@/lib/session';
import { listContracts, type ContractSummary } from '@/modules/crm/services/contract.service';
import { listOrganisations } from '@/modules/crm/services/organisation.service';
import { fromMinorUnits, listProducts } from '@/modules/crm/services/product.service';
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import { archiveContractAction, renewContractAction, setContractStatusAction } from './actions';
import { ContractPanel } from './contract-panel';

export const metadata = { title: 'Contracts · COEX' };

const STATUS_LABEL: Record<ContractSummary['status'], string> = {
  draft: 'Draft',
  active: 'Active',
  expiring: 'Expiring',
  expired: 'Expired',
  renewed: 'Renewed',
  cancelled: 'Cancelled',
};

const STATUS_TONE = {
  draft: 'neutral',
  active: 'ok',
  expiring: 'warn',
  expired: 'alert',
  renewed: 'neutral',
  cancelled: 'neutral',
} as const;

const FREQUENCY_LABEL: Record<ContractSummary['billingFrequency'], string> = {
  monthly: 'Monthly',
  bimonthly: 'Every two months',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export default async function ContractsPage() {
  const actor = await requirePermission('contract.read');
  const editable = actor.permissions.includes('contract.manage');

  const [contracts, organisations, products] = await asUser(actor, () =>
    Promise.all([listContracts(), listOrganisations(), listProducts()]),
  );

  const renewalsDue = contracts.filter(
    (contract) => contract.status === 'expiring' || contract.status === 'expired',
  );
  const customers = organisations.map(({ id, name }) => ({ id, name }));
  const productChoices = products.map(({ id, name, code }) => ({ id, name, code }));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Contracts"
        description="Annual maintenance agreements and other contracts. Invoicing and payment stay in Zoho Books; this page tracks the terms, the billing rhythm and what is about to expire."
        action={
          editable ? (
            <ContractPanel organisations={customers} products={productChoices} />
          ) : undefined
        }
      />

      {renewalsDue.length > 0 ? (
        // Not a Notice: that renders a paragraph, and a list inside a paragraph is invalid HTML
        // that breaks hydration in production.
        <section
          role="status"
          className="mb-4 rounded-[var(--radius-control)] bg-[var(--color-status-warn-soft)] px-3 py-2 text-sm text-[var(--color-status-warn)]"
        >
          <div className="font-medium">
            {renewalsDue.length} contract{renewalsDue.length === 1 ? '' : 's'} need renewal
          </div>
          <ul className="mt-1 space-y-0.5">
            {renewalsDue.map((contract) => (
              <li key={contract.id}>
                {contract.organisationName}: {contract.title} ({contract.number}){' '}
                {contract.status === 'expired' ? 'ended' : 'ends'} {contract.endDate}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Card>
        {contracts.length === 0 ? (
          <EmptyState message="No contracts yet. Add the first annual maintenance agreement." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Contract</Th>
                <Th>Customer</Th>
                <Th>Status</Th>
                <Th>Term</Th>
                <Th>Billing</Th>
                <Th>Amount</Th>
                <Th>{''}</Th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => (
                <tr
                  key={contract.id}
                  data-sort-values={JSON.stringify([
                    contract.number,
                    contract.organisationName,
                    contract.status,
                    contract.endDate,
                    contract.billingFrequency,
                    contract.valueMinorUnits,
                  ])}
                >
                  <Td>
                    <Link
                      href={`/contracts/${contract.id}`}
                      className="font-medium text-[var(--color-ink)] hover:underline"
                    >
                      {contract.title}
                    </Link>
                    <div className="font-mono text-xs text-[var(--color-ink-subtle)]">
                      {contract.number}
                    </div>
                  </Td>
                  <Td>{contract.organisationName}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[contract.status]}>
                      {STATUS_LABEL[contract.status]}
                    </Badge>
                  </Td>
                  <Td className="text-[var(--color-ink-muted)]">
                    {contract.startDate} to {contract.endDate}
                  </Td>
                  <Td className="text-[var(--color-ink-muted)]">
                    {FREQUENCY_LABEL[contract.billingFrequency]}
                  </Td>
                  <Td className="text-[var(--color-ink-muted)]">
                    {contract.currency} {fromMinorUnits(contract.valueMinorUnits)}
                  </Td>
                  <Td>
                    {editable ? (
                      <div className="flex items-center justify-end gap-1">
                        <ContractPanel
                          organisations={customers}
                          products={productChoices}
                          contract={{
                            id: contract.id,
                            organisationId: contract.organisationId,
                            title: contract.title,
                            type: contract.type,
                            startDate: contract.startDate,
                            endDate: contract.endDate,
                            billingFrequency: contract.billingFrequency,
                            value: fromMinorUnits(contract.valueMinorUnits),
                            currency: contract.currency,
                            productIds: contract.productIds,
                            documentUrl: contract.documentUrl ?? '',
                            zohoReference: contract.zohoReference ?? '',
                            supportHoursEnabled: contract.supportHoursEnabled,
                            includedHoursPerPeriod:
                              contract.includedHoursPerPeriod === null
                                ? ''
                                : String(contract.includedHoursPerPeriod),
                            notes: contract.notes ?? '',
                          }}
                        />
                        {contract.storedStatus === 'draft' ? (
                          <form action={setContractStatusAction}>
                            <input type="hidden" name="id" value={contract.id} />
                            <input type="hidden" name="status" value="active" />
                            <IconButton type="submit" icon="status" label="Activate contract" />
                          </form>
                        ) : null}
                        {contract.storedStatus === 'active' &&
                        !contracts.some((other) => other.renewedFromId === contract.id) ? (
                          <form action={renewContractAction}>
                            <input type="hidden" name="id" value={contract.id} />
                            <IconButton type="submit" icon="restore" label="Renew contract" />
                          </form>
                        ) : null}
                        {contract.storedStatus === 'active' ? (
                          <form action={setContractStatusAction}>
                            <input type="hidden" name="id" value={contract.id} />
                            <input type="hidden" name="status" value="cancelled" />
                            <IconButton type="submit" icon="remove" label="Cancel contract" />
                          </form>
                        ) : null}
                        <form action={archiveContractAction}>
                          <input type="hidden" name="id" value={contract.id} />
                          <IconButton type="submit" icon="archive" label="Archive contract" />
                        </form>
                      </div>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
