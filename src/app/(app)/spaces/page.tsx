import { asUser, requirePermission } from '@/lib/session';
import { listSpaces } from '@/modules/tasks/services/space.service';
import { listFolders } from '@/modules/tasks/services/folder.service';
import { listOrganisations } from '@/modules/crm/services/organisation.service';
import { Card, PageHeader } from '@/components/ui';
import { NewSpacePanel } from './panels';
import { SpacesTable } from './spaces-table';
import { listUsers } from '@/modules/core/services/user.service';

export const metadata = { title: 'Spaces · COEX' };

/**
 * Four levels: space, folder, task, subtask.
 *
 * A folder is the only place visibility is decided. Name members on one and it becomes private to
 * exactly those people; leave it empty and everyone who can open the space can see it.
 */
export default async function SpacesPage() {
  const actor = await requirePermission('task.read.all');

  const { spaces, folders, customers, users } = await asUser(actor, async () => ({
    spaces: await listSpaces(),
    folders: await listFolders(),
    customers: await listOrganisations(),
    users: await listUsers(),
  }));

  const customerNames = Object.fromEntries(customers.map((customer) => [customer.id, customer.name]));
  const userNames = Object.fromEntries(users.map((user) => [user.id, user.name]));
  const canManage = actor.permissions.includes('task.manage');

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Spaces"
        description="A space is a body of work with an owner. Inside it are folders, then tasks, then subtasks."
        action={
          canManage ? (
            <NewSpacePanel
              customers={customers.map((customer) => ({ id: customer.id, name: customer.name }))}
              users={users.map((user) => ({ id: user.id, name: user.name }))}
            />
          ) : undefined
        }
      />

      <Card>
        <SpacesTable
          spaces={spaces.map((space) => ({
            id: space.id,
            name: space.name,
            description: space.description,
            organisationId: space.organisationId,
            dueDate: space.dueDate ? space.dueDate.toISOString() : null,
            openTaskCount: space.openTaskCount,
            totalTaskCount: space.totalTaskCount,
            progressPercent: space.progressPercent,
            memberIds: space.memberIds,
          }))}
          folders={folders.map((folder) => ({
            id: folder.id,
            spaceId: folder.spaceId,
            name: folder.name,
            isPrivate: folder.isPrivate,
          }))}
          customerNames={customerNames}
          userNames={userNames}
          canManage={canManage}
        />
      </Card>
    </div>
  );
}
