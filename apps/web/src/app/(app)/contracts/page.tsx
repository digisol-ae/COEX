import Link from 'next/link';
import { clsx } from 'clsx';
import { asUser, requirePermission } from '@/lib/session';
import { listContracts, type ContractSummary } from '@/modules/crm/services/contract.service';
import { listOrganisations } from '@/modules/crm/services/organisation.service';
import { fromMinorUnits, listProducts } from '@/modules/crm/services/product.service';
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import {
  matchesContractFilter,
  parseContractFilter,
  type ContractFilter,
} from '@coex/shared/crm/contract-status';
import { archiveContractAction, renewContractAction, setContractStatusAction } from './actions';
import { ContractEmailButton } from './contract-email-button';
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

const FILTERS: {
  id: ContractFilter;
  label: string;
  hint: string;
  color: string;
}[] = [
  {
    id: 'all',
    label: 'All',
    hint: 'Every contract',
    color: 'text-[var(--color-ink-muted)] bg-[var(--color-surface-sunken)]',
  },
  {
    id: 'due',
    label: 'Needs renewal',
    hint: "In force and inside the customer's warning window, or past its end date",
    color: 'text-[var(--color-status-warn)] bg-[var(--color-status-warn-soft)]',
  },
  {
    id: '30',
    label: 'Expiring in 30 days',
    hint: 'In force and ending within 30 days',
    color: 'text-[var(--color-status-warn)] bg-[var(--color-status-warn-soft)]',
  },
  {
    id: '60',
    label: 'Expiring in 60 days',
    hint: 'In force and ending within 60 days',
    color: 'text-[var(--color-status-info)] bg-[var(--color-status-info-soft)]',
  },
  {
    id: 'expired',
    label: 'Expired',
    hint: 'Still marked active but past the end date',
    color: 'text-[var(--color-status-alert)] bg-[var(--color-status-alert-soft)]',
  },
];

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const filter = parseContractFilter((await searchParams).filter);
  const actor = await requirePermission('contract.read');
  const editable = actor.permissions.includes('contract.manage');

  const [allContracts, organisations, products] = await asUser(actor, () =>
    Promise.all([listContracts(), listOrganisations(), listProducts()]),
  );

  const contracts = allContracts.filter((contract) => matchesContractFilter(contract, filter));
  const countFor = (option: ContractFilter) =>
    allContracts.filter((contract) => matchesContractFilter(contract, option)).length;
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

      <div className="mb-4 flex flex-wrap gap-2" aria-label="Contract expiry filters">
        {FILTERS.map((option) => {
          const selected = filter === option.id;

          return (
            <Link
              key={option.id}
              href={option.id === 'all' ? '/contracts' : `/contracts?filter=${option.id}`}
              title={option.hint}
              aria-current={selected ? 'true' : undefined}
              className={clsx(
                'inline-flex items-center gap-2 rounded-[var(--radius-control)] border px-3 py-2 text-sm font-medium transition-colors',
                option.color,
                selected ? 'border-current' : 'border-transparent hover:border-current',
              )}
            >
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
              {option.label}
              <span className="font-semibold tabular-nums">({countFor(option.id)})</span>
            </Link>
          );
        })}
      </div>

      <Card>
        {contracts.length === 0 ? (
          <EmptyState
            message={
              filter === 'all'
                ? 'No contracts yet. Add the first annual maintenance agreement.'
                : 'No contracts match this filter.'
            }
          />
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
                        <ContractEmailButton
                          contractId={contract.id}
                          lastEmailedAt={contract.lastEmailedAt}
                        />
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
                            contactIds: contract.contactIds,
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
