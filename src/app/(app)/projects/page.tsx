import Link from 'next/link';
import { asUser, requirePermission } from '@/lib/session';
import { listPortfolios, listProjects } from '@/modules/tasks/services/portfolio.service';
import { listOrganisations } from '@/modules/crm/services/organisation.service';
import { Badge, Card, CardSection, EmptyState, PageHeader } from '@/components/ui';
import { NewPortfolioPanel, NewProjectPanel } from './panels';

export const metadata = { title: 'Projects · COEX' };

/**
 * Portfolios hold projects, projects hold tasks. Two levels, which is as deep as the structure
 * goes, and the reason a new team member can be shown the whole shape in a minute.
 */
export default async function ProjectsPage() {
  const actor = await requirePermission('task.read.all');

  const { portfolios, projects, customers } = await asUser(actor, async () => ({
    portfolios: await listPortfolios(),
    projects: await listProjects(),
    customers: await listOrganisations(),
  }));

  const canManage = actor.permissions.includes('task.manage');

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Projects"
        description="A portfolio is a business area such as Support or Implementation. A project is a body of work with a start, an end and an owner."
        action={canManage ? <NewPortfolioPanel /> : undefined}
      />

      {portfolios.length === 0 ? (
        <Card>
          <EmptyState message="No portfolios yet. Create one such as Support, Product or Implementation." />
        </Card>
      ) : (
        <div className="space-y-6">
          {portfolios.map((portfolio) => {
            const inPortfolio = projects.filter((project) => project.portfolioId === portfolio.id);

            return (
              <Card key={portfolio.id}>
                <CardSection>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-medium text-[var(--color-ink)]">
                        {portfolio.name}
                      </h2>
                      {portfolio.description ? (
                        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                          {portfolio.description}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                        {portfolio.projectCount} projects · {portfolio.openTaskCount} open tasks
                      </p>
                    </div>

                    {canManage ? (
                      <NewProjectPanel
                        portfolioId={portfolio.id}
                        customers={customers.map((customer) => ({
                          id: customer.id,
                          name: customer.name,
                        }))}
                      />
                    ) : null}
                  </div>
                </CardSection>

                {inPortfolio.length === 0 ? (
                  <CardSection>
                    <p className="text-sm text-[var(--color-ink-subtle)]">No projects yet.</p>
                  </CardSection>
                ) : (
                  <CardSection>
                    <ul className="divide-y divide-[var(--color-line)]">
                      {inPortfolio.map((project) => (
                        <li key={project.id} className="flex items-center justify-between py-3">
                          <div>
                            <Link
                              href={`/projects/${project.id}`}
                              className="font-medium text-[var(--color-ink)] underline-offset-4 hover:underline"
                            >
                              {project.name}
                            </Link>
                            {project.description ? (
                              <p className="text-xs text-[var(--color-ink-subtle)]">
                                {project.description}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-3 text-sm text-[var(--color-ink-muted)]">
                            {project.dueDate ? (
                              <span className="text-xs">
                                due {project.dueDate.toLocaleDateString('en-GB')}
                              </span>
                            ) : null}
                            <Badge tone={project.openTaskCount > 0 ? 'info' : 'ok'}>
                              {project.openTaskCount} open
                            </Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardSection>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
