/** Synthetic records for the isolated Docker database only. Never loads host env files. */
import { existsSync } from 'node:fs';
import mongoose from 'mongoose';
import { runWithContext } from '../apps/web/src/lib/tenant-context';
import { UserModel } from '@coex/shared/core/models/user.model';
import { SpaceModel } from '@coex/shared/tasks/models/space.model';
import { TaskModel } from '@coex/shared/tasks/models/task.model';
import { QueueModel } from '@coex/shared/tickets/models/queue.model';
import { TicketModel } from '@coex/shared/tickets/models/ticket.model';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { createSpace } from '../apps/web/src/modules/tasks/services/space.service';
import { createTask } from '../apps/web/src/modules/tasks/services/task.service';
import { createQueue } from '../apps/web/src/modules/tickets/services/queue.service';
import { createTicket } from '../apps/web/src/modules/tickets/services/ticket.service';
import { createOrganisation } from '../apps/web/src/modules/crm/services/organisation.service';

async function main() {
  const uri = new URL(process.env.MONGODB_URI ?? '');
  if (
    !existsSync('/.dockerenv') ||
    uri.hostname !== 'mongo' ||
    uri.pathname !== '/coex_docker_local'
  )
    throw new Error('This seed only runs inside the isolated COEX Docker stack.');
  await mongoose.connect(uri.toString());
  const actor = await UserModel.findOne({ email: 'docker-admin@example.test', deletedAt: null });
  if (!actor) throw new Error('Run the administrator seed first.');
  await runWithContext(
    { tenantId: actor.tenantId, userId: actor._id, isPlatformAdmin: true },
    async () => {
      const tenantId = actor.tenantId;
      const space = await SpaceModel.findOne({
        tenantId,
        name: 'Docker QA Test Workspace',
        deletedAt: null,
      });
      const spaceId = space
        ? String(space._id)
        : await createSpace({
            name: 'Docker QA Test Workspace',
            description: 'Synthetic local Docker testing records.',
          });
      const queue = await QueueModel.findOne({
        tenantId,
        name: 'Docker QA Support',
        deletedAt: null,
      });
      const queueId = queue
        ? String(queue._id)
        : await createQueue({ name: 'Docker QA Support', defaultAssigneeId: String(actor._id) });
      const customer = await OrganisationModel.findOne({
        tenantId,
        name: 'Docker QA Test Customer',
        deletedAt: null,
      });
      const organisationId = customer
        ? String(customer._id)
        : await createOrganisation({
            name: 'Docker QA Test Customer',
            kind: 'client',
            email: 'docker-customer@example.test',
          });
      const tasks = [
        'Review customer onboarding',
        'Check ticket attachments',
        'Verify task assignment',
        'Review weekly timesheet',
        'Prepare support checklist',
        'Validate customer search',
        'Review product catalogue',
        'Check contract reminders',
        'Verify lead follow-up',
        'Review dashboard counts',
      ];
      const tickets = [
        'Unable to sign in',
        'Attachment preview question',
        'New user access request',
        'Task notification question',
        'Timesheet entry assistance',
        'Customer details correction',
        'Product setup question',
        'Contract renewal enquiry',
        'Lead import assistance',
        'Dashboard count question',
      ];
      const priorities = ['normal', 'high', 'low', 'urgent'] as const;
      for (let i = 0; i < 10; i++) {
        const title = `[Docker QA ${String(i + 1).padStart(2, '0')}] ${tasks[i]}`;
        if (!(await TaskModel.exists({ tenantId, spaceId, title, deletedAt: null })))
          await createTask({
            spaceId,
            title,
            description: 'Synthetic local Docker QA record; no live customer data.',
            priority: priorities[i % 4],
            assigneeIds: [String(actor._id)],
            organisationId,
          });
        const subject = `[Docker QA ${String(i + 1).padStart(2, '0')}] ${tickets[i]}`;
        if (!(await TicketModel.exists({ tenantId, queueId, subject, deletedAt: null })))
          await createTicket({
            queueId,
            subject,
            body: 'Synthetic support request for local Docker testing only.',
            priority: priorities[i % 4],
            organisationId,
            channel: 'agent',
            onBehalfOfCustomer: true,
          });
      }
      console.log(
        JSON.stringify({
          tasks: await TaskModel.countDocuments({ tenantId, spaceId, deletedAt: null }),
          tickets: await TicketModel.countDocuments({ tenantId, queueId, deletedAt: null }),
          database: mongoose.connection.name,
        }),
      );
    },
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
