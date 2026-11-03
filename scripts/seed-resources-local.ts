/** Dedicated local-only fixture. No SMTP worker or real customer is used. */
import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { EmailSettingsModel } from '@coex/shared/core/models/email-settings.model';
import { ResourceModel } from '@coex/shared/resources/models';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { runWithContext } from '../apps/web/src/lib/tenant-context';
import { hashPassword } from '../apps/web/src/lib/password';
import { createOrganisation } from '../apps/web/src/modules/crm/services/organisation.service';
import { saveResource } from '../apps/web/src/modules/resources/service';
import { createQueue } from '../apps/web/src/modules/tickets/services/queue.service';
import { createTicket } from '../apps/web/src/modules/tickets/services/ticket.service';
import { QueueModel } from '@coex/shared/tickets/models/queue.model';
import { TicketModel } from '@coex/shared/tickets/models/ticket.model';
async function main() {
  if (process.env.MONGODB_URI !== 'mongodb://127.0.0.1:27020/worktello_resources_local')
    throw new Error('Dedicated resource QA database only');
  await mongoose.connect(process.env.MONGODB_URI);
  let tenant = await TenantModel.findOne({ slug: 'resource-local-qa' });
  tenant ??= await TenantModel.create({ name: 'Resource Library QA', slug: 'resource-local-qa' });
  let user = await UserModel.findOne({
    tenantId: tenant._id,
    email: 'resource-admin@example.test',
  });
  if (!user) {
    const password = randomBytes(18).toString('base64url');
    user = await UserModel.create({
      tenantId: tenant._id,
      name: 'Resource QA Admin',
      email: 'resource-admin@example.test',
      role: 'tenant_admin',
      status: 'active',
      passwordHash: await hashPassword(password),
      mustChangePassword: false,
    });
    writeFileSync(
      '/private/tmp/worktello-resources-login.json',
      JSON.stringify({ email: user.email, password }),
      { mode: 0o600 },
    );
  }
  await EmailSettingsModel.updateOne(
    { tenantId: tenant._id },
    {
      $set: {
        'outbound.enabled': true,
        'outbound.host': 'smtp.example.test',
        'outbound.fromAddress': 'qa@example.test',
      },
    },
    { upsert: true },
  );
  await runWithContext(
    { tenantId: tenant._id, userId: user._id, isPlatformAdmin: false },
    async () => {
      const org = await OrganisationModel.findOne({
        tenantId: tenant._id,
        name: '[Resource QA] Customer',
      });
      const organisationId = org
        ? String(org._id)
        : await createOrganisation({
            name: '[Resource QA] Customer',
            kind: 'client',
            email: 'resource-customer@example.test',
          });
      const name = '[Resource QA] PDF guide';
      if (!(await ResourceModel.exists({ tenantId: tenant._id, title: name }))) {
        // A minimal real PDF generated without external data.
        const { PDFDocument, StandardFonts } = await import('pdf-lib');
        const doc = await PDFDocument.create();
        const page = doc.addPage();
        const font = await doc.embedFont(StandardFonts.Helvetica);
        page.drawText('Resource Library QA - Download and preview guide', {
          x: 40,
          y: 740,
          size: 16,
          font,
        });
        await saveResource({
          title: name,
          description: 'Synthetic guide for local preview and download acceptance.',
          product: 'Worktello',
          category: 'Getting started',
          status: 'published',
          file: { name: 'resource-qa-guide.pdf', body: Buffer.from(await doc.save()) },
        });
        await saveResource({
          title: '[Resource QA] Video tutorial',
          product: 'Worktello',
          category: 'Getting started',
          status: 'published',
          videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
        });
        await saveResource({
          title: '[Resource QA] Draft - do not share',
          videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
        });
      }
      let ticket = await TicketModel.findOne({
        tenantId: tenant._id,
        subject: '[Resource QA] Tutorial request',
      });
      if (!ticket) {
        const queue = await QueueModel.findOne({ tenantId: tenant._id, name: 'Resource QA' });
        const queueId = queue ? String(queue._id) : await createQueue({ name: 'Resource QA' });
        const created = await createTicket({
          queueId,
          organisationId,
          subject: '[Resource QA] Tutorial request',
          body: 'Please share the getting-started documents.',
          channel: 'agent',
        });
        ticket = await TicketModel.findById(created.id);
      }
      console.log(
        JSON.stringify({
          database: mongoose.connection.name,
          ticketId: String(ticket!._id),
          organisationId,
          resources: await ResourceModel.countDocuments({ tenantId: tenant._id }),
        }),
      );
    },
  );
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
