import { asUser, getSignedInUser } from '@/lib/session';
import { listTasks } from '@/modules/tasks/services/task.service';
import { listOrganisationChoices } from '@/modules/crm/services/organisation.service';
import { listSpaces } from '@/modules/tasks/services/space.service';
import { searchTickets } from '@/modules/tickets/services/ticket.service';
import { SEARCH_SCOPES, type SearchScope } from '@/components/navigation/search-context';
import { listProducts } from '@/modules/crm/services/product.service';
import { listContracts } from '@/modules/crm/services/contract.service';
import { listLeads } from '@/modules/crm/services/lead.service';
import { listOpportunities } from '@/modules/crm/services/opportunity.service';
import { STATUS_LABELS } from '@/modules/tickets/labels';

/**
 * Quick search across the things people look for by name: a task, a project, a customer.
 *
 * Matching happens in the services, so tenant scoping and permissions apply exactly as they do on
 * the screens. A search that could reach another tenant's data would be the worst possible place
 * to take a shortcut.
 */
export async function GET(request: Request) {
  const user = await getSignedInUser();

  if (user?.role === 'client_contact')
    return Response.json({ error: 'Not allowed.' }, { status: 403 });
  if (!user) {
    return Response.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const scope = params.get('scope') ?? 'all';
  if (!(SEARCH_SCOPES as readonly string[]).includes(scope))
    return Response.json({ error: 'Unknown search section.' }, { status: 400 });
  const includes = (section: SearchScope) => scope === section || scope === 'all';
  const query = params.get('q')?.trim().slice(0, 120).toLowerCase() ?? '';

  if (query.length < 2) {
    return Response.json({ results: [] });
  }

  const results = await asUser(user, async () => {
    const found: { type: string; label: string; detail: string; href: string }[] = [];

    if (includes('tasks') && user.permissions.includes('task.read.own')) {
      const tasks = await listTasks({
        assigneeId: user.permissions.includes('task.read.all') ? undefined : user.id,
        includeClosed: true,
      });

      for (const task of tasks) {
        if (task.title.toLowerCase().includes(query) || task.number.toLowerCase().includes(query)) {
          found.push({
            type: 'Task',
            label: task.title,
            detail: `${task.number} · ${task.spaceName}`,
            href: `/tasks/${task.id}`,
          });
        }
      }
    }

    if (includes('spaces') && user.permissions.includes('task.read.all')) {
      const spaces = await listSpaces();

      for (const space of spaces) {
        if (space.name.toLowerCase().includes(query)) {
          found.push({
            type: 'Space',
            label: space.name,
            detail: `${space.openTaskCount} open`,
            href: `/spaces/${space.id}`,
          });
        }
      }
    }

    if (includes('tickets') && user.permissions.includes('ticket.read.own')) {
      const seesEveryTicket = user.permissions.includes('ticket.read.all');
      const tickets = await searchTickets(query);

      for (const ticket of tickets) {
        if (!seesEveryTicket && ticket.assigneeId !== user.id) continue;

        found.push({
          type: 'Ticket',
          label: ticket.subject,
          detail: `${ticket.number} · ${STATUS_LABELS[ticket.status]}`,
          href: `/support/tickets/${ticket.id}`,
        });
      }
    }

    if (includes('customers') && user.permissions.includes('customer.read')) {
      const customers = await listOrganisationChoices({ search: query, limit: 20 });

      for (const customer of customers) {
        found.push({
          type: 'Customer',
          label: customer.name,
          detail: customer.kind,
          href: `/customers/${customer.id}`,
        });
      }
    }

    // These services retain their existing tenant, deletion and owner checks.
    if (scope === 'products' && user.permissions.includes('products.read')) {
      for (const item of await listProducts(true)) {
        if (
          [item.name, item.code, item.description].some((text) =>
            text?.toLowerCase().includes(query),
          )
        )
          found.push({
            type: 'Product',
            label: item.name,
            detail: item.code,
            href: `/products#product-${item.id}`,
          });
      }
    }
    if (scope === 'contracts' && user.permissions.includes('contract.read')) {
      for (const item of await listContracts()) {
        if (
          [item.title, item.number, item.organisationName].some((text) =>
            text.toLowerCase().includes(query),
          )
        )
          found.push({
            type: 'Contract',
            label: item.title,
            detail: `${item.number} · ${item.organisationName}`,
            href: `/contracts/${item.id}`,
          });
      }
    }
    if (scope === 'leads' && user.permissions.includes('lead.read')) {
      for (const item of await listLeads({ search: query }))
        found.push({
          type: 'Lead',
          label: item.name,
          detail: item.number,
          href: `/leads?q=${encodeURIComponent(item.number)}`,
        });
    }
    if (scope === 'opportunities' && user.permissions.includes('opportunity.read')) {
      for (const item of await listOpportunities({ search: query }))
        found.push({
          type: 'Opportunity',
          label: item.title,
          detail: item.number,
          href: `/opportunities/${item.id}`,
        });
    }
    return found.slice(0, 20);
  });

  return Response.json({ results });
}
