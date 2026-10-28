import { LiveRefresh } from '@/components/ui/live-refresh';
import Link from 'next/link';
import { asUser, requirePermission } from '@/lib/session';
import { listContracts, type ContractSummary } from '@/modules/crm/services/contract.service';
import { listOrganisationChoices } from '@/modules/crm/services/organisation.service';
import { fromMinorUnits, listProducts } from '@/modules/crm/services/product.service';
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import { Icon } from '@/components/ui/icon-button';
import { FilterToggleLink } from '@/components/ui/filter-toggle';
import {
  matchesContractFilter,
  parseContractFilter,
  type ContractFilter,
} from '@coex/shared/crm/contract-status';
import { archiveContractAction, renewContractAction, setContractStatusAction } from './actions';
import { ContractEmailButton } from './contract-email-button';
import { ContractPanel } from './contract-panel';

export const metadata = { title: 'Contracts · Worktello' };

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
}[] = [
  {
    id: 'all',
    label: 'All',
    hint: 'Every contract',
  },
  {
    id: 'due',
    label: 'Needs renewal',
    hint: "In force and inside the customer's warning window, or past its end date",
  },
  {
    id: '30',
    label: 'Expiring in 30 days',
    hint: 'In force and ending within 30 days',
  },
  {
    id: '60',
    label: 'Expiring in 60 days',
    hint: 'In force and ending within 60 days',
  },
  {
    id: 'expired',
    label: 'Expired',
    hint: 'Still marked active but past the end date',
  },
];

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; customer?: string; model?: string }>;
}) {
  const query = await searchParams;
  const filter = parseContractFilter(query.filter);
  const actor = await requirePermission('contract.read');
  const editable = actor.permissions.includes('contract.manage');

  const [allContracts, organisations, products] = await asUser(actor, () =>
    Promise.all([listContracts(), listOrganisationChoices(), listProducts()]),
  );

  const contracts = allContracts.filter(
    (contract) =>
      matchesContractFilter(contract, filter) &&
      (!query.customer || contract.organisationId === query.customer) &&
      (!query.model ||
        (query.model === 'subscription'
          ? contract.type === 'subscription'
          : contract.type !== 'subscription')),
  );
  const countFor = (option: ContractFilter) =>
    allContracts.filter(
      (contract) =>
        matchesContractFilter(contract, option) &&
        (!query.customer || contract.organisationId === query.customer) &&
        (!query.model ||
          (query.model === 'subscription'
            ? contract.type === 'subscription'
            : contract.type !== 'subscription')),
    ).length;
  const customers = organisations.map(({ id, name }) => ({ id, name }));
  const productChoices = products.map(({ id, name, code }) => ({ id, name, code }));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Contracts & subscriptions"
        description="Contractual IT and perpetual licence support, software and hardware subscriptions. Track agreement terms, upfront charges, billing cycles and renewals."
        action={
          <div className="flex items-center gap-3">
            <LiveRefresh />
            <Link className="text-sm font-medium underline" href="/contracts/templates">
              Contract templates
            </Link>
            {editable ? (
              <ContractPanel
                organisations={customers}
                products={productChoices}
                prefill={
                  query.customer && customers.some((customer) => customer.id === query.customer)
                    ? { organisationId: query.customer }
                    : undefined
                }
              />
            ) : null}
          </div>
        }
      />

      <div
        className="coex-filters mb-3 flex flex-wrap items-center gap-1.5"
        aria-label="Service model filters"
      >
        {[
          ['', 'All services'],
          ['contractual', 'Contractual'],
          ['subscription', 'Subscriptions'],
        ].map(([model, label]) => (
          <FilterToggleLink
            key={model}
            label={label}
            active={query.model === model || (!query.model && !model)}
            icon={
              <Icon name={!model ? 'filter' : model === 'subscription' ? 'calendar' : 'status'} />
            }
            href={`/contracts?${new URLSearchParams({ ...(query.customer ? { customer: query.customer } : {}), ...(model ? { model } : {}), filter })}`}
          >
            {label}
          </FilterToggleLink>
        ))}
        {query.customer ? (
          <FilterToggleLink
            href="/contracts"
            label="Show contracts for all customers"
            active={false}
            icon={<Icon name="customer" />}
          >
            All customers
          </FilterToggleLink>
        ) : null}
      </div>
      <div
        className="coex-filters mb-3 flex flex-wrap gap-1.5"
        aria-label="Contract expiry filters"
      >
        {FILTERS.map((option) => {
          const selected = filter === option.id;

          return (
            <FilterToggleLink
              key={option.id}
              href={`/contracts?${new URLSearchParams({ filter: option.id, ...(query.customer ? { customer: query.customer } : {}), ...(query.model ? { model: query.model } : {}) })}`}
              title={option.hint}
              label={`${option.label}: ${option.hint}`}
              active={selected}
              tone={option.id === 'expired' ? 'danger' : 'default'}
              icon={
                <Icon
                  name={option.id === 'all' ? 'filter' : option.id === 'due' ? 'alert' : 'clock'}
                />
              }
            >
              {option.label}
              <span className="font-semibold tabular-nums">({countFor(option.id)})</span>
            </FilterToggleLink>
          );
        })}
      </div>

      <Card>
        {contracts.length === 0 ? (
          <EmptyState
            message={
              filter === 'all'
                ? 'No services yet. Add a contractual agreement or subscription.'
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
                    <div className="mb-1 text-xs text-[var(--color-ink-muted)]">
                      {contract.type === 'subscription' ? 'Subscription' : 'Contractual'}
                    </div>
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
                            pricingMethod: contract.pricingMethod,
                            licenceValue: fromMinorUnits(contract.licenceValueMinorUnits),
                            annualSupportPercent: contract.annualSupportPercent?.toString() ?? '',
                            setupFee: fromMinorUnits(contract.setupFeeMinorUnits),
                            trainingFee: fromMinorUnits(contract.trainingFeeMinorUnits),
                            hardwareTerms: contract.hardwareTerms ?? '',
                            serviceLines: contract.serviceLines?.map((line) => ({
                              ...line,
                              unitPrice: fromMinorUnits(line.unitPriceMinorUnits),
                            })),
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
