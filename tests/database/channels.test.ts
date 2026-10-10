import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { clearDatabase, connectForTests, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { sealSecret } from '@/lib/secret-box';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { ContactModel } from '@coex/shared/crm/models/contact.model';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { createQueue } from '@/modules/tickets/services/queue.service';
import { changeStatus } from '@/modules/tickets/services/ticket.service';
import { TicketModel } from '@coex/shared/tickets/models/ticket.model';
import { TicketMessageModel } from '@coex/shared/tickets/models/ticket-message.model';
import { ChannelSettingsModel } from '@coex/shared/channels/models/channel-settings.model';
import { ChannelMessageModel } from '@coex/shared/channels/models/channel-message.model';
import {
  acknowledgeOutbox,
  authenticateChannelRequest,
  deliverPendingChannelMessages,
  leaseOutbox,
  storeInbound,
} from '@/modules/channels/services/channel-messages.service';
import { processPendingSupportInbound } from '@/modules/channels/services/support-inbound.service';
import { signPayload } from '@/modules/channels/signature';

process.env.COEX_ENCRYPTION_KEY ??= 'test-only-key';

const tenantId = new Types.ObjectId();
const userId = new Types.ObjectId();
const context = { tenantId, userId, isPlatformAdmin: false };
const SUPPORT = '+97142000000';
const CRM = '+97142000001';
const CUSTOMER = '+971501234567';
let counter = 0;

function incoming(text: string, from = CUSTOMER, to = SUPPORT) {
  counter += 1;
  return {
    providerMessageId: `wamid.${counter}`,
    to,
    from,
    profileName: 'Ahmed',
    sentAt: new Date(Date.now() + counter),
    type: 'text' as const,
    text,
    media: null,
    replyToProviderMessageId: null,
  };
}

async function receive(text: string, from = CUSTOMER) {
  return runWithContext(context, async () => {
    const stored = await storeInbound([incoming(text, from)]);
    await processPendingSupportInbound();
    return stored;
  });
}

const whatsappTickets = () =>
  TicketModel.find({ tenantId, channel: 'whatsapp' }).sort({ createdAt: 1 }).lean();

beforeAll(async () => {
  await connectForTests('channels');
});

afterAll(async () => {
  await disconnectFromTests();
});

beforeEach(async () => {
  await clearDatabase();
  await TenantModel.create({
    _id: tenantId,
    name: 'DigiSol',
    slug: 'digisol',
    numbering: { taskPrefix: 'DGS-T', ticketPrefix: 'DGS-S' },
  });
  await UserModel.create({
    _id: userId,
    tenantId,
    name: 'Syed Ali',
    email: 'ali@example.com',
    role: 'tenant_admin',
    passwordHash: 'x',
    status: 'active',
  });
  const queueId = await runWithContext(context, () => createQueue({ name: 'WhatsApp Support' }));
  await ChannelSettingsModel.create({
    tenantId,
    enabled: true,
    provider: 'mock',
    delivery: 'push',
    signingSecretSealed: sealSecret('whsec_test'),
    actorUserId: userId,
    accounts: {
      support: { enabled: true, number: SUPPORT, queueId },
      crm: { enabled: true, number: CRM },
    },
  });
});

describe('signed requests', () => {
  it('accepts a correctly signed call and refuses anything else', async () => {
    const body = JSON.stringify(incoming('Hi'));
    const timestamp = String(Math.floor(Date.now() / 1000));
    const headers = (signature: string) =>
      new Headers({ 'x-coex-timestamp': timestamp, 'x-coex-signature': signature });

    const good = await authenticateChannelRequest(
      'digisol',
      headers(signPayload('whsec_test', timestamp, body)),
      body,
    );
    expect(good.ok).toBe(true);

    const bad = await authenticateChannelRequest('digisol', headers('sha256=00'), body);
    expect(bad.ok).toBe(false);

    const unknown = await authenticateChannelRequest(
      'nobody',
      headers(signPayload('whsec_test', timestamp, body)),
      body,
    );
    expect(unknown).toMatchObject({ ok: false, status: 401 });
  });
});

describe('incoming messages', () => {
  it('stores a delivery once, even when the provider sends it twice', async () => {
    const message = incoming('Hello');
    const first = await runWithContext(context, () => storeInbound([message]));
    const again = await runWithContext(context, () => storeInbound([message]));
    expect(first.stored).toBe(1);
    expect(again.duplicates).toBe(1);
    expect(await ChannelMessageModel.countDocuments({ direction: 'in' })).toBe(1);
  });

  it('refuses a message to a number COEX does not own', async () => {
    const result = await runWithContext(context, () =>
      storeInbound([incoming('Hello', CUSTOMER, '+97140000009')]),
    );
    expect(result.rejected).toHaveLength(1);
  });
});

describe('Support number creates tickets', () => {
  it('opens a ticket for an unknown number and acknowledges it on WhatsApp', async () => {
    await receive('My printer is not working');

    const [ticket] = await whatsappTickets();
    expect(ticket.requesterPhone).toBe(CUSTOMER);
    expect(ticket.requesterName).toBe('Ahmed');
    expect(ticket.contactId).toBeNull();
    expect(ticket.subject).toBe('WhatsApp from Ahmed: My printer is not working');

    const ack = await ChannelMessageModel.findOne({ direction: 'out' }).lean();
    expect(ack?.to).toBe(CUSTOMER);
    expect(ack?.text).toContain(ticket.number);
    expect(String(ack?.ticketId)).toBe(String(ticket._id));

    const stored = await ChannelMessageModel.findOne({ direction: 'in' }).lean();
    expect(stored?.processedAt).toBeInstanceOf(Date);
    expect(String(stored?.ticketId)).toBe(String(ticket._id));
  });

  it('adds later messages to the same open ticket, without a second acknowledgement', async () => {
    await receive('First');
    await receive('Second');

    const tickets = await whatsappTickets();
    expect(tickets).toHaveLength(1);
    const publicMessages = await TicketMessageModel.find({
      ticketId: tickets[0]._id,
      visibility: 'public',
    }).lean();
    expect(publicMessages.map((message) => message.body)).toEqual(['First', 'Second']);
    expect(await ChannelMessageModel.countDocuments({ direction: 'out' })).toBe(1);
  });

  it('reopens a resolved ticket when the customer writes again', async () => {
    await receive('First');
    const [ticket] = await whatsappTickets();
    await runWithContext(context, () => changeStatus(String(ticket._id), 'resolved'));

    await receive('Still broken');

    const [after] = await whatsappTickets();
    expect(after.status).toBe('open');
  });

  it('starts a new ticket after Closed, referring back to the old one', async () => {
    await receive('First');
    const [ticket] = await whatsappTickets();
    await runWithContext(context, async () => {
      await changeStatus(String(ticket._id), 'resolved');
      await changeStatus(String(ticket._id), 'closed');
    });

    await receive('New problem');

    const tickets = await whatsappTickets();
    expect(tickets).toHaveLength(2);
    expect(String(tickets[1].followsOnFromId)).toBe(String(ticket._id));
  });

  it('links a known contact and their customer', async () => {
    const organisation = await OrganisationModel.create({ tenantId, name: 'Dental Studio' });
    const contact = await ContactModel.create({
      tenantId,
      organisationId: organisation._id,
      name: 'Dr Sara',
      mobile: CUSTOMER,
    });

    await receive('Hello');

    const [ticket] = await whatsappTickets();
    expect(String(ticket.contactId)).toBe(String(contact._id));
    expect(String(ticket.organisationId)).toBe(String(organisation._id));
    expect(ticket.subject).toBe('WhatsApp from Dr Sara: Hello');
  });

  it('leaves CRM number messages for the CRM milestone', async () => {
    await runWithContext(context, async () => {
      await storeInbound([incoming('Price list please', CUSTOMER, CRM)]);
      await processPendingSupportInbound();
    });
    expect(await whatsappTickets()).toHaveLength(0);
    const stored = await ChannelMessageModel.findOne({ direction: 'in' }).lean();
    expect(stored?.account).toBe('crm');
    expect(stored?.processedAt).toBeNull();
  });
});

describe('outbox', () => {
  it('test mode sends queued messages', async () => {
    await receive('Hello');
    const result = await deliverPendingChannelMessages();
    expect(result.sent).toBe(1);
    const sent = await ChannelMessageModel.findOne({ direction: 'out' }).lean();
    expect(sent?.status).toBe('sent');
    expect(sent?.providerMessageId).toMatch(/^mock-/);
  });

  it('XVERSE collecting: leased once, acknowledged, never sent twice', async () => {
    await ChannelSettingsModel.updateOne({ tenantId }, { $set: { delivery: 'pull' } });
    await receive('Hello');

    const leased = await runWithContext(context, () => leaseOutbox());
    expect(leased).toHaveLength(1);
    expect(await runWithContext(context, () => leaseOutbox())).toHaveLength(0);

    const ack = await runWithContext(context, () =>
      acknowledgeOutbox([{ id: leased[0].id, status: 'sent', providerMessageId: 'x-1' }]),
    );
    expect(ack.acknowledged).toBe(1);
    const sent = await ChannelMessageModel.findOne({ direction: 'out' }).lean();
    expect(sent?.status).toBe('sent');
    expect(sent?.providerMessageId).toBe('x-1');
  });
});
