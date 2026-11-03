import mongoose from 'mongoose';
import { writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { SpaceModel } from '@coex/shared/tasks/models/space.model';
import { TicketModel } from '@coex/shared/tickets/models/ticket.model';
import { TimeEntryModel } from '@coex/shared/time/models/time-entry.model';
import { createTask } from '../apps/web/src/modules/tasks/services/task.service';
import { runWithContext } from '../apps/web/src/lib/tenant-context';
import { hashPassword } from '../apps/web/src/lib/password';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (uri !== 'mongodb://127.0.0.1:27020/worktello_feedback_local')
    throw new Error('Local feedback database only');
  await mongoose.connect(uri);
  let tenant = await TenantModel.findOne({ slug: 'feedback-local' });
  tenant ??= await TenantModel.create({
    name: 'Worktello Local Feedback QA',
    slug: 'feedback-local',
  });
  let actor = await UserModel.findOne({
    tenantId: tenant._id,
    email: 'feedback-admin@example.test',
  });
  if (!actor) {
    const password = randomBytes(12).toString('base64url');
    actor = await UserModel.create({
      tenantId: tenant._id,
      name: 'Local QA Administrator',
      email: 'feedback-admin@example.test',
      role: 'tenant_admin',
      status: 'active',
      passwordHash: await hashPassword(password),
      mustChangePassword: false,
    });
    writeFileSync(
      '/private/tmp/worktello-feedback-login.json',
      JSON.stringify({ email: actor.email, password }),
      { mode: 0o600 },
    );
  }
  await runWithContext(
    { tenantId: tenant._id, userId: actor._id, isPlatformAdmin: false },
    async () => {
      let org = await OrganisationModel.findOne({ tenantId: tenant._id, name: 'QA Test Customer' });
      org ??= await OrganisationModel.create({
        tenantId: tenant._id,
        name: 'QA Test Customer',
        kind: 'client',
        email: 'info@qa-customer.test',
      });
      let space = await SpaceModel.findOne({ tenantId: tenant._id, name: 'QA Feedback Review' });
      space ??= await SpaceModel.create({
        tenantId: tenant._id,
        name: 'QA Feedback Review',
        organisationId: org._id,
        statuses: [
          { name: 'To do', sortOrder: 0, isClosed: false },
          { name: 'Done', sortOrder: 1, isClosed: true },
        ],
      });
      const existing = await TimeEntryModel.exists({ tenantId: tenant._id });
      if (!existing) {
        const taskId = await createTask({
          spaceId: String(space._id),
          title: '[QA] Review feedback changes',
          assigneeIds: [String(actor!._id)],
          organisationId: String(org._id),
        });
        const endedAt = new Date(Date.now() - 75 * 60000);
        await TimeEntryModel.create({
          tenantId: tenant._id,
          userId: actor!._id,
          taskId,
          workDate: new Date(),
          startedAt: new Date(endedAt.getTime() - 30 * 60000),
          endedAt,
          minutes: 30,
          running: false,
        });
        await TicketModel.create({
          tenantId: tenant._id,
          queueId: new mongoose.Types.ObjectId(),
          number: 'QA-S-1',
          subject: '[QA] Email contact example',
          requesterName: 'QA Ticket Person',
          requesterEmail: 'person@qa-customer.test',
          ccEmails: ['copied@qa-customer.test'],
        });
      }
    },
  );
  console.log(
    'Synthetic feedback workspace ready. Login saved in /private/tmp/worktello-feedback-login.json',
  );
  await mongoose.disconnect();
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
