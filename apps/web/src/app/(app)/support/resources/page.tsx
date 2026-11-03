import { asUser, requirePermission } from '@/lib/session';
import { PageHeader, Card, CardSection, Input, Button } from '@/components/ui';
import { listResources, shareHistory } from '@/modules/resources/service';
import { ResourceLibrary, ResourceShareHistory } from './resource-manager';
export const metadata = { title: 'Customer resources · Worktello' };
export default async function CustomerResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const actor = await requirePermission('resource.read');
  const { search = '' } = await searchParams;
  const canShare = actor.permissions.includes('resource.share');
  const [resources, shares] = await asUser(actor, () =>
    Promise.all([listResources(search), canShare ? shareHistory() : Promise.resolve([])]),
  );
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title="Customer resources"
        description="Documents and video tutorials to share with customers by email or ticket. No customer account is needed; access uses a one-time email code."
      />
      <Card>
        <CardSection title="Resource library">
          <form className="mb-4 flex gap-2" method="get">
            <Input
              name="search"
              aria-label="Search resources"
              defaultValue={search}
              placeholder="Search titles, products and categories"
            />
            <Button variant="secondary">Search</Button>
          </form>
          <ResourceLibrary
            resources={resources}
            canShare={canShare}
            canManage={actor.permissions.includes('resource.manage')}
          />
        </CardSection>
      </Card>
      {canShare ? (
        <Card>
          <CardSection title="Sharing history">
            <ResourceShareHistory shares={shares} />
          </CardSection>
        </Card>
      ) : null}
    </div>
  );
}
