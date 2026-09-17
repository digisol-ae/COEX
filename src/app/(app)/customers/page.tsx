import Link from 'next/link';
import { asUser, requirePermission } from '@/lib/session';
import {
  listOrganisations,
  type OrganisationKind,
} from '@/modules/crm/services/organisation.service';
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';
import { CustomerFilters } from './filters';
import { NewCustomerPanel } from './new-customer-panel';

export const metadata = { title: 'Customers · COEX' };

const KIND_TONE = {
  client: 'ok',
  prospect: 'info',
  supplier: 'neutral',
  partner: 'neutral',
} as const;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; kind?: string }>;
}) {
  const actor = await requirePermission('customer.read');
  const params = await searchParams;

  const organisations = await asUser(actor, () =>
    listOrganisations({
      search: params.search,
      kind: params.kind ? (params.kind as OrganisationKind) : undefined,
    }),
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Customers"
        description="One record per company, shared by tickets, tasks and everything that comes later. A prospect becomes a client without losing its history."
        action={actor.permissions.includes('customer.manage') ? <NewCustomerPanel /> : undefined}
      />

      <CustomerFilters search={params.search ?? ''} kind={params.kind ?? ''} />

      <Card className="mt-4">
        {organisations.length === 0 ? (
          <EmptyState message="No customers yet. Add the first one to start the timeline." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Industry</Th>
                <Th>Contacts</Th>
                <Th>Sites</Th>
              </tr>
            </thead>
            <tbody>
              {organisations.map((organisation) => (
                <tr key={organisation.id}>
                  <Td>
                    <Link
                      href={`/customers/${organisation.id}`}
                      className="font-medium text-[var(--color-ink)] underline-offset-4 hover:underline"
                    >
                      {organisation.name}
                    </Link>
                    {organisation.email ? (
                      <div className="text-xs text-[var(--color-ink-subtle)]">
                        {organisation.email}
                      </div>
                    ) : null}
                  </Td>
                  <Td>
                    <Badge tone={KIND_TONE[organisation.kind]}>{organisation.kind}</Badge>
                  </Td>
                  <Td className="text-[var(--color-ink-muted)]">{organisation.industry ?? '—'}</Td>
                  <Td className="text-[var(--color-ink-muted)]">{organisation.contactCount}</Td>
                  <Td className="text-[var(--color-ink-muted)]">{organisation.locationCount}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
