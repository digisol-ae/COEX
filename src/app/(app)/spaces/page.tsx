import Link from 'next/link';
import { asUser, requirePermission } from '@/lib/session';
import { listSpaces } from '@/modules/tasks/services/space.service';
import { listFolders } from '@/modules/tasks/services/folder.service';
import { listOrganisations } from '@/modules/crm/services/organisation.service';
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';
import { Progress } from '@/components/ui/progress';
import { Monogram } from '@/components/ui/monogram';
import { NewSpacePanel } from './panels';

export const metadata = { title: 'Spaces · COEX' };

/**
 * Four levels: space, folder, task, subtask.
 *
 * A folder is the only place visibility is decided. Name members on one and it becomes private to
 * exactly those people; leave it empty and everyone who can open the space can see it.
 */
export default async function SpacesPage() {
  const actor = await requirePermission('task.read.all');

  const { spaces, folders, customers } = await asUser(actor, async () => ({
    spaces: await listSpaces(),
    folders: await listFolders(),
    customers: await listOrganisations(),
  }));

  const customerNames = new Map(customers.map((customer) => [customer.id, customer.name]));
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
            />
          ) : undefined
        }
      />

      <Card>
        {spaces.length === 0 ? (
          <EmptyState message="No spaces yet. Create one such as dOne Platform or Project Management." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Space</Th>
                <Th>Folders</Th>
                <Th>Customer</Th>
                <Th>Progress</Th>
                <Th>Open</Th>
                <Th>Due</Th>
              </tr>
            </thead>
            <tbody>
              {spaces.map((space) => {
                const inside = folders.filter((folder) => folder.spaceId === space.id);

                return (
                  <tr key={space.id}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Monogram name={space.name} />
                        <div className="min-w-0">
                          <Link
                            href={`/spaces/${space.id}`}
                            className="block truncate font-medium text-[var(--color-ink)] underline-offset-4 hover:underline"
                          >
                            {space.name}
                          </Link>
                          {space.description ? (
                            <div className="truncate text-xs text-[var(--color-ink-subtle)]">
                              {space.description}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </Td>

                    <Td className="text-[var(--color-ink-muted)]">
                      {inside.length === 0 ? (
                        '—'
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          {inside.slice(0, 3).map((folder) => (
                            <span
                              key={folder.id}
                              className="rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] px-1.5 py-0.5 text-[11px]"
                            >
                              {folder.isPrivate ? '🔒 ' : ''}
                              {folder.name}
                            </span>
                          ))}
                          {inside.length > 3 ? (
                            <span className="text-[11px]">and {inside.length - 3} more</span>
                          ) : null}
                        </span>
                      )}
                    </Td>

                    <Td className="text-[var(--color-ink-muted)]">
                      {space.organisationId
                        ? (customerNames.get(space.organisationId) ?? 'Unknown')
                        : '—'}
                    </Td>

                    <Td className="w-48">
                      <Progress percent={space.progressPercent} label={`${space.name} progress`} />
                    </Td>

                    <Td>
                      <Badge tone={space.openTaskCount > 0 ? 'info' : 'ok'}>
                        {space.openTaskCount} of {space.totalTaskCount}
                      </Badge>
                    </Td>

                    <Td className="text-[var(--color-ink-muted)]">
                      {space.dueDate ? space.dueDate.toLocaleDateString('en-GB') : '—'}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
