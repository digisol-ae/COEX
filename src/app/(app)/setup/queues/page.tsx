import { asUser, requirePermission } from '@/lib/session';
import { listQueues } from '@/modules/tickets/services/queue.service';
import { listUsers } from '@/modules/core/services/user.service';
import { listProducts } from '@/modules/crm/services/product.service';
import { Card, CardSection, EmptyState, PageHeader } from '@/components/ui';
import { QueueList } from './queue-list';

export const metadata = { title: 'Queues · COEX' };

export default async function QueuesPage() {
  const actor = await requirePermission('tenant.manage');

  const { queues, users, products } = await asUser(actor, async () => ({
    queues: await listQueues({ includeArchived: true }),
    users: await listUsers(),
    products: await listProducts(),
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Queues"
        description="Where tickets land, who is expected to answer, and how quickly we promised to. Targets are working hours, so a promise made on Friday evening lands on Monday morning."
      />

      <div className="mt-4">
        {queues.length === 0 ? (
          <Card>
            <CardSection>
              <EmptyState message="No queues yet. The first one becomes the default." />
            </CardSection>
          </Card>
        ) : null}

        <QueueList
          queues={queues}
          users={users.map((user) => ({ id: user.id, name: user.name }))}
          products={products.map((product) => ({ id: product.id, name: product.name }))}
        />
      </div>
    </div>
  );
}
