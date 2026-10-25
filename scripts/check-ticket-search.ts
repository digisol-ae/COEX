import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { runWithContext } from '../apps/web/src/lib/tenant-context';
import { connectToDatabase } from '../apps/web/src/lib/db';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { ContactModel } from '@coex/shared/crm/models/contact.model';
import { QueueModel } from '@coex/shared/tickets/models/queue.model';
import { TicketModel } from '@coex/shared/tickets/models/ticket.model';
import { TicketMessageModel } from '@coex/shared/tickets/models/ticket-message.model';
import {
  listTickets,
  searchTickets,
} from '../apps/web/src/modules/tickets/services/ticket.service';
import { portalTickets } from '../apps/web/src/modules/portal/service';
async function main() {
  const uri = new URL(process.env.MONGODB_URI ?? '');
  assert.equal(uri.hostname, 'mongo');
  assert.equal(uri.pathname, '/coex_test_ticket_search');
  await connectToDatabase();
  const tenant = await TenantModel.create({ name: 'QA Search', slug: 'qa-search-' + Date.now() });
  const admin = await UserModel.create({
    tenantId: tenant._id,
    name: 'QA Admin',
    email: `admin-${Date.now()}@example.test`,
    role: 'tenant_admin',
  });
  const agent = await UserModel.create({
    tenantId: tenant._id,
    name: 'QA Agent',
    email: `agent-${Date.now()}@example.test`,
    role: 'agent',
  });
  const company = await OrganisationModel.create({
    tenantId: tenant._id,
    name: 'Marina Dental Search QA',
    email: 'office-search@example.test',
    phone: '+971 4 456 7890',
  });
  const customer = await UserModel.create({
    tenantId: tenant._id,
    name: 'QA Customer',
    email: `customer-${Date.now()}@example.test`,
    role: 'client_contact',
    organisationId: company._id,
  });
  const contact = await ContactModel.create({
    tenantId: tenant._id,
    organisationId: company._id,
    name: 'Sana Search QA',
    email: customer.email,
    mobile: '+971501234567',
    userId: customer._id,
  });
  const queue = await QueueModel.create({ tenantId: tenant._id, name: 'QA Queue' });
  const ticket = await TicketModel.create({
    tenantId: tenant._id,
    number: 'QA-' + Date.now(),
    subject: 'Router configuration issue',
    status: 'closed',
    queueId: queue._id,
    organisationId: company._id,
    contactId: contact._id,
    requesterName: contact.name,
    requesterEmail: contact.email,
    requesterPhone: '050 123 4567',
    assigneeId: agent._id,
    ccEmails: ['copy-search@example.test'],
    tags: ['warranty-search'],
  });
  await TicketMessageModel.create([
    {
      tenantId: tenant._id,
      ticketId: ticket._id,
      visibility: 'public',
      direction: 'inbound',
      body: 'Intermittent printer offline after firmware',
      authorName: contact.name,
      attachments: [
        {
          fileName: 'diagnostic-search.pdf',
          contentType: 'application/pdf',
          storageKey: 'qa-not-a-file',
          bytes: 1,
        },
      ],
    },
    {
      tenantId: tenant._id,
      ticketId: ticket._id,
      visibility: 'internal',
      direction: 'outbound',
      body: 'private-search-needle',
      authorName: admin.name,
    },
  ]);
  const context = { tenantId: tenant._id, userId: admin._id, isPlatformAdmin: false };
  await runWithContext(context, async () => {
    for (const q of [
      ticket.number,
      'router',
      'PRINTER',
      '"printer offline"',
      'Marina',
      'Sana',
      customer.email,
      'office-search@example.test',
      '0501234567',
      '+971 (50) 123-4567',
      '4567',
      'copy-search@example.test',
      'warranty-search',
      'diagnostic-search.pdf',
      'private-search-needle',
      'Marina firmware',
    ])
      assert(
        (await listTickets({ search: q })).some((t) => t.id === String(ticket._id)),
        q,
      );
    assert.equal((await listTickets({ search: 'Marina missingword' })).length, 0);
    assert.equal((await listTickets({ search: '.*' })).length, 0);
    assert.equal((await listTickets({ search: 'firmware', status: 'open' })).length, 0);
    assert.equal(
      (await listTickets({ search: 'firmware', queueId: String(new mongoose.Types.ObjectId()) }))
        .length,
      0,
    );
  });
  await runWithContext({ ...context, userId: customer._id }, async () => {
    assert.equal((await portalTickets('firmware')).total, 1);
    assert.equal((await portalTickets('private-search-needle')).total, 0);
    assert.equal((await portalTickets('warranty-search')).total, 0);
    assert.equal((await portalTickets('copy-search@example.test')).total, 0);
    assert.equal((await searchTickets('firmware')).length, 0);
  });
  await runWithContext({ ...context, userId: agent._id }, async () => {
    assert.equal((await searchTickets('firmware')).length, 1);
  });
  const hidden = await TicketModel.create({
    tenantId: tenant._id,
    number: 'HIDDEN-' + Date.now(),
    subject: 'Not assigned to QA Agent',
    queueId: queue._id,
    assigneeId: admin._id,
  });
  await TicketMessageModel.create({
    tenantId: tenant._id,
    ticketId: hidden._id,
    visibility: 'internal',
    direction: 'outbound',
    body: 'other-agent-search-needle',
    authorName: admin.name,
  });
  await runWithContext({ ...context, userId: agent._id }, async () =>
    assert.equal((await searchTickets('other-agent-search-needle')).length, 0),
  );
  const foreign = await TenantModel.create({
    name: 'QA Foreign',
    slug: 'qa-foreign-' + Date.now(),
  });
  await runWithContext({ ...context, tenantId: foreign._id }, async () =>
    assert.equal((await listTickets({ search: 'firmware' })).length, 0),
  );
  await TicketModel.updateOne({ _id: ticket._id }, { $set: { deletedAt: new Date() } });
  await runWithContext(context, async () =>
    assert.equal((await listTickets({ search: 'firmware' })).length, 0),
  );
  console.log(
    'PASS: number, subject, description/replies, internal notes, customer/contact names and email, local/international/formatted/partial phones, CC, tags, filenames, multi-word/quoted/literal terms, closed history, filters, tenant scope, staff assignment, portal privacy, and soft-delete exclusion.',
  );
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : 'Search checks failed');
  process.exitCode = 1;
  void mongoose.disconnect();
});
