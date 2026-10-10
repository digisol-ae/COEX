import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { EmailSettingsModel } from '@coex/shared/core/models/email-settings.model';
import { EmailOutboxModel } from '@coex/shared/core/models/email-outbox.model';
import { ContactModel } from '@coex/shared/crm/models/contact.model';
import { createOrganisation } from '@/modules/crm/services/organisation.service';
import { createQueue } from '@/modules/tickets/services/queue.service';
import {
  addReply,
  createTicket,
  getTicketDetail,
  customerReplyAddress,
} from '@/modules/tickets/services/ticket.service';
import {
  listCollaboratorOptions,
  setTicketCollaborators,
} from '@/modules/tickets/services/collaborator.service';

const tenantId = new Types.ObjectId();
const userId = new Types.ObjectId();
const context = { tenantId, userId, isPlatformAdmin: false };
beforeAll(() => connectForTests('ticket_cc_1003'));
afterAll(disconnectFromTests);
beforeEach(async () => {
  await clearDatabase();
  await TenantModel.create({ _id: tenantId, name: 'Test', slug: 'test' });
  await UserModel.create({
    _id: userId,
    tenantId,
    name: 'Agent',
    email: 'agent@example.com',
    role: 'tenant_admin',
  });
  await EmailSettingsModel.create({ tenantId, outbound: { enabled: true } });
});

it('uses the customer email, persists CC, and queues CC only for public replies', async () => {
  await runWithContext(context, async () => {
    const organisationId = await createOrganisation({
      name: 'Customer',
      email: 'customer@example.com',
      kind: 'client',
    });
    const queueId = await createQueue({ name: 'Support' });
    const { id } = await createTicket({
      queueId,
      organisationId,
      subject: 'Test',
      body: 'Test',
      channel: 'agent',
      ccEmails: ['agent@example.com', 'AGENT@example.com', 'customer@example.com'],
    });
    expect(await customerReplyAddress(id)).toBe('customer@example.com');
    expect((await getTicketDetail(id))?.ccEmails).toEqual([
      'agent@example.com',
      'customer@example.com',
    ]);
    await addReply({ ticketId: id, body: 'Private', visibility: 'internal' });
    expect(await EmailOutboxModel.countDocuments({ kind: 'ticket_reply' })).toBe(0);
    await addReply({ ticketId: id, body: 'Public', visibility: 'public' });
    const mail = await EmailOutboxModel.findOne({ kind: 'ticket_reply' });
    expect(mail?.to).toBe('customer@example.com');
    expect(mail?.cc).toEqual(['agent@example.com']);
    await setTicketCollaborators(id, []);
    expect((await getTicketDetail(id))?.ccEmails).toEqual([]);
    await expect(
      runWithContext({ ...context, tenantId: new Types.ObjectId() }, () =>
        setTicketCollaborators(id, ['other@example.com']),
      ),
    ).rejects.toThrow('Ticket not found');
  });
});

it('shows local team and customer contacts and excludes another tenant', async () => {
  await runWithContext(context, async () => {
    const organisationId = await createOrganisation({
      name: 'Customer',
      email: 'customer@example.com',
      kind: 'client',
    });
    await ContactModel.create([
      { tenantId, organisationId, name: 'Local', email: 'local@example.com' },
      {
        tenantId: new Types.ObjectId(),
        organisationId,
        name: 'Foreign',
        email: 'foreign@example.com',
      },
    ]);
    const options = await listCollaboratorOptions();
    expect(options.map((row) => row.email)).toEqual(
      expect.arrayContaining(['agent@example.com', 'local@example.com', 'customer@example.com']),
    );
    expect(options.some((row) => row.email === 'foreign@example.com')).toBe(false);
  });
});

it('keeps the default sender and stores a configured override only for public replies', async () => {
  await EmailSettingsModel.updateOne(
    { tenantId },
    {
      $set: {
        'outbound.fromAddress': 'support@example.com',
        'senders.alert.fromAddress': 'alerts@example.com',
      },
    },
  );
  await runWithContext(context, async () => {
    const organisationId = await createOrganisation({
      name: 'Customer',
      email: 'customer@example.com',
      kind: 'client',
    });
    const queueId = await createQueue({ name: 'Support' });
    const { id } = await createTicket({
      queueId,
      organisationId,
      subject: 'Sender test',
      body: 'Test',
      channel: 'agent',
    });
    await addReply({ ticketId: id, body: 'Default sender', visibility: 'public' });
    expect(
      (await EmailOutboxModel.findOne({ kind: 'ticket_reply', text: /Default sender/ }))?.sender,
    ).toBeNull();
    await addReply({
      ticketId: id,
      body: 'Alternate sender',
      visibility: 'public',
      sender: 'alert',
    });
    expect(
      (await EmailOutboxModel.findOne({ kind: 'ticket_reply', text: /Alternate sender/ }))?.sender,
    ).toBe('alert');
    const before = (await getTicketDetail(id))?.messages.length;
    await expect(
      addReply({ ticketId: id, body: 'Invalid sender', visibility: 'public', sender: 'admin' }),
    ).rejects.toThrow('configured sending');
    expect((await getTicketDetail(id))?.messages.length).toBe(before);
    await addReply({ ticketId: id, body: 'Internal', visibility: 'internal', sender: 'alert' });
    expect(await EmailOutboxModel.countDocuments({ kind: 'ticket_reply' })).toBe(2);
  });
});
