import { asUser, getSignedInUser } from '@/lib/session';
import { listTasks } from '@/modules/tasks/services/task.service';
import { listOrganisations } from '@/modules/crm/services/organisation.service';
import { listProjects } from '@/modules/tasks/services/project.service';
import { searchTickets } from '@/modules/tickets/services/ticket.service';
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

  if (!user) {
    return Response.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const query = new URL(request.url).searchParams.get('q')?.trim().toLowerCase() ?? '';

  if (query.length < 2) {
    return Response.json({ results: [] });
  }

  const results = await asUser(user, async () => {
    const found: { type: string; label: string; detail: string; href: string }[] = [];

    if (user.permissions.includes('task.read.own')) {
      const tasks = await listTasks({
        assigneeId: user.permissions.includes('task.read.all') ? undefined : user.id,
        includeClosed: true,
      });

      for (const task of tasks) {
        if (task.title.toLowerCase().includes(query) || task.number.toLowerCase().includes(query)) {
          found.push({
            type: 'Task',
            label: task.title,
            detail: `${task.number} · ${task.projectName}`,
            href: `/tasks/${task.id}`,
          });
        }
      }
    }

    if (user.permissions.includes('task.read.all')) {
      const projects = await listProjects();

      for (const project of projects) {
        if (project.name.toLowerCase().includes(query)) {
          found.push({
            type: 'Project',
            label: project.name,
            detail: `${project.openTaskCount} open`,
            href: `/projects/${project.id}`,
          });
        }
      }
    }

    if (user.permissions.includes('ticket.read.own')) {
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

    if (user.permissions.includes('customer.read')) {
      const customers = await listOrganisations({ search: query });

      for (const customer of customers) {
        found.push({
          type: 'Customer',
          label: customer.name,
          detail: customer.kind,
          href: `/customers/${customer.id}`,
        });
      }
    }

    return found.slice(0, 20);
  });

  return Response.json({ results });
}
