import { asUser, requirePermission } from '@/lib/session';
import { fromMinorUnits, listProducts } from '@/modules/crm/services/product.service';
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';
import { ProductPanel } from './product-panel';
import { StatusToggle } from './status-toggle';

export const metadata = { title: 'Products · COEX' };

const PERIOD_LABEL: Record<string, string> = {
  once: 'One off',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export default async function ProductsPage() {
  const actor = await requirePermission('products.read');
  const products = await asUser(actor, () => listProducts(true));

  const editable = actor.permissions.includes('products.manage');

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Products"
        description="What DigiSol sells and supports. Contracts, tickets and any later invoicing all price from this list rather than keeping their own, so a rename happens once."
        action={editable ? <ProductPanel /> : undefined}
      />

      <Card>
        {products.length === 0 ? (
          <EmptyState message="No products yet. Add R4+, dOne, XVerse and their modules." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>Code</Th>
                <Th>Type</Th>
                <Th>List price</Th>
                <Th>Billing</Th>
                <Th>{''}</Th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <Td>
                    <div className="font-medium text-[var(--color-ink)]">{product.name}</div>
                    {product.description ? (
                      <div className="text-xs text-[var(--color-ink-subtle)]">
                        {product.description}
                      </div>
                    ) : null}
                  </Td>
                  <Td className="font-mono text-xs text-[var(--color-ink-muted)]">
                    {product.code}
                  </Td>
                  <Td>
                    <Badge tone={product.status === 'active' ? 'neutral' : 'warn'}>
                      {product.status === 'active' ? product.kind : 'retired'}
                    </Badge>
                  </Td>
                  <Td className="text-[var(--color-ink-muted)]">
                    {product.listPriceMinorUnits === null
                      ? '—'
                      : `${product.currency} ${fromMinorUnits(product.listPriceMinorUnits)}`}
                  </Td>
                  <Td className="text-[var(--color-ink-muted)]">
                    {PERIOD_LABEL[product.billingPeriod]}
                  </Td>
                  <Td>
                    {editable ? <StatusToggle id={product.id} status={product.status} /> : null}
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
