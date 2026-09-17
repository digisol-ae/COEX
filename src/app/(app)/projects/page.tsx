import Link from 'next/link';
import { asUser, requirePermission } from '@/lib/session';
import { listProjects } from '@/modules/tasks/services/project.service';
import { listOrganisations } from '@/modules/crm/services/organisation.service';
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from '@/components/ui';
import { NewProjectPanel } from './panels';

export const metadata = { title: 'Projects · COEX' };

/**
 * Projects, then tasks, then subtasks. Three levels.
 *
 * Phases such as Discovery or Design are a field on the task rather than a level of their own, so
 * a task moves between phases without being moved between lists.
 */
export default async function ProjectsPage() {
  const actor = await requirePermission('task.read.all');

  const { projects, customers } = await asUser(actor, async () => ({
    projects: await listProjects(),
    customers: await listOrganisations(),
  }));

  const customerNames = new Map(customers.map((customer) => [customer.id, customer.name]));
  const canManage = actor.permissions.includes('task.manage');

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Projects"
        description="A project is a body of work with an owner. Inside it are tasks, and a task can have subtasks."
        action={
          canManage ? (
            <NewProjectPanel
              customers={customers.map((customer) => ({ id: customer.id, name: customer.name }))}
            />
          ) : undefined
        }
      />

      <Card>
        {projects.length === 0 ? (
          <EmptyState message="No projects yet. Create one such as dOne Platform or Project Management." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Project</Th>
                <Th>Customer</Th>
                <Th>Phases</Th>
                <Th>Open</Th>
                <Th>Due</Th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <Td>
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-medium text-[var(--color-ink)] underline-offset-4 hover:underline"
                    >
                      {project.name}
                    </Link>
                    {project.description ? (
                      <div className="text-xs text-[var(--color-ink-subtle)]">
                        {project.description}
                      </div>
                    ) : null}
                  </Td>
                  <Td className="text-[var(--color-ink-muted)]">
                    {project.organisationId
                      ? (customerNames.get(project.organisationId) ?? 'Unknown')
                      : '—'}
                  </Td>
                  <Td className="text-xs text-[var(--color-ink-subtle)]">
                    {project.phases.length ? project.phases.join(', ') : 'none'}
                  </Td>
                  <Td>
                    <Badge tone={project.openTaskCount > 0 ? 'info' : 'ok'}>
                      {project.openTaskCount} of {project.totalTaskCount}
                    </Badge>
                  </Td>
                  <Td className="text-[var(--color-ink-muted)]">
                    {project.dueDate ? project.dueDate.toLocaleDateString('en-GB') : '—'}
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
