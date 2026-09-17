import { asUser, requirePermission } from '@/lib/session';
import { listTenants } from '@/modules/core/services/tenant.service';
import { Badge, Card, PageHeader, Table, Td, Th } from '@/components/ui';
import { CreateTenantPanel } from './create-tenant-panel';

export const metadata = { title: 'Tenants · COEX' };

/**
 * Platform administration. Creating a second tenant here, and seeing that its data never appears
 * inside the first, is the acceptance test for milestone one.
 */
export default async function TenantsPage() {
  const actor = await requirePermission('tenant.create');
  const tenants = await asUser(actor, listTenants);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Tenants"
        description="Every tenant is a separate company with its own users, customers and records. Nothing is shared between them."
        action={<CreateTenantPanel />}
      />

      <Card>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Identifier</Th>
              <Th>Users</Th>
              <Th>Status</Th>
              <Th>Created</Th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id}>
                <Td>
                  <span className="font-medium text-[var(--color-ink)]">{tenant.name}</span>
                </Td>
                <Td className="font-mono text-xs text-[var(--color-ink-muted)]">{tenant.slug}</Td>
                <Td className="text-[var(--color-ink-muted)]">{tenant.userCount}</Td>
                <Td>
                  <Badge tone={tenant.status === 'active' ? 'ok' : 'warn'}>{tenant.status}</Badge>
                </Td>
                <Td className="text-[var(--color-ink-muted)]">
                  {tenant.createdAt.toLocaleDateString('en-GB')}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
