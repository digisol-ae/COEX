import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { connectForTests, clearDatabase, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { ContactModel } from '@coex/shared/crm/models/contact.model';
import { QueueModel } from '@coex/shared/tickets/models/queue.model';
import { TicketModel } from '@coex/shared/tickets/models/ticket.model';
import { TicketMessageModel } from '@coex/shared/tickets/models/ticket-message.model';
import {
  portalNotifications,
  portalIdentity,
  portalTickets,
  portalTicket,
  raisePortalTicket,
  replyFromPortal,
  portalAttachment,
  provisionPortalAccount,
} from '@/modules/portal/service';
import {
  getTicketDetail,
  addReply,
  setTicketCustomer,
} from '@/modules/tickets/services/ticket.service';
vi.mock('@/modules/core/services/email.service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/modules/core/services/email.service')>()),
  alertStaff: vi.fn(),
  publicRepliesAreEmailed: async () => false,
}));
const tenantId = new Types.ObjectId(),
  otherTenantId = new Types.ObjectId(),
  userId = new Types.ObjectId(),
  otherUserId = new Types.ObjectId(),
  adminId = new Types.ObjectId(),
  orgId = new Types.ObjectId(),
  contactId = new Types.ObjectId(),
  otherContactId = new Types.ObjectId(),
  queueId = new Types.ObjectId();
const context = { tenantId, userId, isPlatformAdmin: false };
const admin = { ...context, userId: adminId };
beforeAll(async () => {
  await connectForTests('portal_1018');
});
beforeEach(async () => {
  await clearDatabase();
  await TenantModel.create({ _id: tenantId, name: 'QA Portal', slug: 'qa-portal' });
  await OrganisationModel.create({ _id: orgId, tenantId, name: 'QA Customer' });
  await UserModel.create([
    {
      _id: userId,
      tenantId,
      name: 'QA Contact',
      email: 'qa.portal@example.test',
      role: 'client_contact',
      organisationId: orgId,
    },
    {
      _id: otherUserId,
      tenantId,
      name: 'QA Other',
      email: 'qa.other@example.test',
      role: 'client_contact',
      organisationId: orgId,
    },
    {
      _id: adminId,
      tenantId,
      name: 'QA Admin',
      email: 'qa.admin@example.test',
      role: 'tenant_admin',
    },
  ]);
  await ContactModel.create([
    {
      _id: contactId,
      tenantId,
      organisationId: orgId,
      userId,
      name: 'QA Contact',
      email: 'qa.portal@example.test',
    },
    {
      _id: otherContactId,
      tenantId,
      organisationId: orgId,
      userId: otherUserId,
      name: 'QA Other',
      email: 'qa.other@example.test',
    },
  ]);
  await QueueModel.create({ _id: queueId, tenantId, name: 'QA Support', isDefault: true });
});
afterAll(disconnectFromTests);
async function ownTicket() {
  return runWithContext(context, () =>
    raisePortalTicket({ subject: 'QA Portal request', body: 'Synthetic portal ticket.' }),
  );
}
describe('customer portal isolation and workflow', () => {
  it('notifies only own public support replies and excludes private content', async () => {
    const { id } = await ownTicket();
    const other = await runWithContext({ ...context, userId: otherUserId }, () =>
      raisePortalTicket({ subject: 'Other contact', body: 'Private request' }),
    );
    const now = new Date();
    for (const [ticketId, visibility, channel] of [
      [id, 'public', 'agent'],
      [id, 'internal', 'agent'],
      [id, 'public', 'system'],
      [other.id, 'public', 'agent'],
    ] as const)
      await TicketMessageModel.create({
        tenantId,
        ticketId,
        visibility,
        channel,
        direction: 'outbound',
        authorName: 'Support',
        body: 'Sensitive body',
        sentAt: now,
      });
    const events = await runWithContext(context, () =>
      portalNotifications(new Date(now.getTime() - 1000), new Date(now.getTime() + 1000)),
    );
    expect(events).toHaveLength(1);
    expect(events[0].url).toBe(`/portal/tickets/${id}`);
    expect(JSON.stringify(events)).not.toContain('Sensitive body');
    await ContactModel.updateOne({ _id: contactId }, { $set: { status: 'inactive' } });
    await expect(runWithContext(context, () => portalNotifications(now, now))).rejects.toThrow();
  });
  it('relinks an existing ticket only to a valid active customer/contact and revokes old portal access', async () => {
    const { id } = await ownTicket();
    await expect(
      runWithContext(admin, () =>
        setTicketCustomer(id, String(new Types.ObjectId()), String(otherContactId)),
      ),
    ).rejects.toThrow('active customer');
    await expect(
      runWithContext(admin, () =>
        setTicketCustomer(id, String(orgId), String(new Types.ObjectId())),
      ),
    ).rejects.toThrow('belong');
    await runWithContext(admin, () => setTicketCustomer(id, String(orgId), String(otherContactId)));
    expect(await runWithContext(context, () => portalTicket(id))).toBeNull();
    expect(
      await runWithContext({ ...context, userId: otherUserId }, () => portalTicket(id)),
    ).not.toBeNull();
  });
  it('forces customer identity and uses existing inbound ticket workflow', async () => {
    const { id } = await ownTicket();
    const stored = await TicketModel.findById(id);
    expect(String(stored?.organisationId)).toBe(String(orgId));
    expect(String(stored?.contactId)).toBe(String(contactId));
    expect(stored?.channel).toBe('portal');
    expect(stored?.firstRespondedAt).toBeNull();
    expect(stored?.customerActivityAt).not.toBeNull();
    expect((await runWithContext(context, () => portalTickets())).total).toBe(1);
  });
  it('denies another contact in the same company and across tenants', async () => {
    const { id } = await ownTicket();
    expect(
      await runWithContext({ ...context, userId: otherUserId }, () => portalTicket(id)),
    ).toBeNull();
    expect(
      (await runWithContext({ ...context, userId: otherUserId }, () => portalTickets())).total,
    ).toBe(0);
    await expect(
      runWithContext({ ...context, userId: otherUserId }, () => replyFromPortal(id, 'Should fail')),
    ).rejects.toThrow('Ticket not found');
    await expect(
      runWithContext({ ...context, tenantId: otherTenantId }, portalIdentity),
    ).rejects.toThrow();
  });
  it('never returns internal notes/system events or their attachments', async () => {
    const { id } = await ownTicket();
    const secret = await TicketMessageModel.create({
      tenantId,
      ticketId: id,
      visibility: 'internal',
      direction: 'outbound',
      authorName: 'QA Engineer',
      body: 'Private engineering detail',
      channel: 'system',
      attachments: [
        { fileName: 'private.txt', contentType: 'text/plain', storageKey: 'never-read', bytes: 10 },
      ],
    });
    const view = await runWithContext(context, () => portalTicket(id));
    expect(view?.messages).toHaveLength(1);
    expect(JSON.stringify(view)).not.toContain('Private engineering');
    expect(
      await runWithContext(context, () => portalAttachment(id, String(secret.attachments[0]._id))),
    ).toBeNull();
  });
  it('makes a public staff reply visible and reopens resolved tickets for inbound replies', async () => {
    const { id } = await ownTicket();
    await runWithContext(admin, () =>
      addReply({ ticketId: id, body: 'Public support answer', visibility: 'public' }),
    );
    await TicketModel.updateOne({ _id: id }, { $set: { status: 'resolved' } });
    await runWithContext(context, () => replyFromPortal(id, 'It still needs help.'));
    const stored = await TicketModel.findById(id);
    expect(stored?.status).toBe('open');
    const detail = await runWithContext(admin, () => getTicketDetail(id));
    expect(detail?.messages.at(-1)?.direction).toBe('inbound');
    expect(
      (await runWithContext(context, () => portalTicket(id)))?.messages.some(
        (m) => m.body === 'Public support answer',
      ),
    ).toBe(true);
  });
  it('refuses replies to closed/merged tickets and invalid IDs', async () => {
    const { id } = await ownTicket();
    await TicketModel.updateOne({ _id: id }, { $set: { status: 'closed' } });
    await expect(
      runWithContext(context, () => replyFromPortal(id, 'No reopening closed')),
    ).rejects.toThrow('no longer accepts');
    expect(await runWithContext(context, () => portalTicket('bad-id'))).toBeNull();
  });
  it('revokes access immediately on contact archive, user suspension, or staff role', async () => {
    await ContactModel.updateOne({ _id: contactId }, { $set: { deletedAt: new Date() } });
    await expect(runWithContext(context, portalIdentity)).rejects.toThrow();
    await ContactModel.updateOne({ _id: contactId }, { $set: { deletedAt: null } });
    await UserModel.updateOne({ _id: userId }, { $set: { status: 'suspended' } });
    await expect(runWithContext(context, portalIdentity)).rejects.toThrow();
    await expect(runWithContext(admin, portalIdentity)).rejects.toThrow();
  });
  it('rejects oversized files before creating a ticket', async () => {
    await expect(
      runWithContext(context, () =>
        raisePortalTicket({
          subject: 'QA oversized',
          body: 'Test',
          files: [
            {
              fileName: 'large.bin',
              contentType: 'application/octet-stream',
              body: Buffer.alloc(3 * 1024 * 1024 + 1),
            },
          ],
        }),
      ),
    ).rejects.toThrow('3 MB');
    expect(await TicketModel.countDocuments()).toBe(0);
  });
  it('requires admin provisioning and never converts existing staff accounts', async () => {
    const contact = await ContactModel.create({
      tenantId,
      organisationId: orgId,
      name: 'QA New',
      email: 'qa.new@example.test',
    });
    await expect(
      runWithContext(context, () => provisionPortalAccount(String(contact._id))),
    ).rejects.toThrow('Not allowed');
    const result = await runWithContext(admin, () => provisionPortalAccount(String(contact._id)));
    expect(result.password.length).toBeGreaterThan(8);
    const updated = await ContactModel.findById(contact._id);
    const account = await UserModel.findById(updated?.userId);
    expect(account?.role).toBe('client_contact');
    expect(String(account?.organisationId)).toBe(String(orgId));
    await ContactModel.create({
      tenantId,
      organisationId: orgId,
      name: 'QA duplicate',
      email: 'qa.admin@example.test',
    }).then(async (c) => {
      await expect(
        runWithContext(admin, () => provisionPortalAccount(String(c._id))),
      ).rejects.toThrow('already has');
    });
    expect((await UserModel.findById(adminId))?.role).toBe('tenant_admin');
  });
  it('loads 10 more own tickets cumulatively without exposing another customer', async () => {
    await TicketModel.insertMany(
      Array.from({ length: 55 }, (_, index) => ({
        tenantId,
        queueId,
        organisationId: orgId,
        contactId,
        subject: `Paging ${index}`,
        number: `P-${index}`,
      })),
    );
    await TicketModel.create({
      tenantId,
      queueId,
      organisationId: orgId,
      contactId: otherContactId,
      subject: 'Foreign contact',
      number: 'P-foreign',
    });
    const first = await runWithContext(context, () => portalTickets('', 1, '', true));
    const second = await runWithContext(context, () => portalTickets('', 2, '', true));
    const last = await runWithContext(context, () => portalTickets('', 6, '', true));
    expect(first.total).toBe(55);
    expect(first.tickets).toHaveLength(10);
    expect(second.tickets).toHaveLength(20);
    expect(last.tickets).toHaveLength(55);
    expect(new Set(last.tickets.map((ticket) => ticket.id)).size).toBe(55);
    expect(last.tickets.some((ticket) => ticket.number === 'P-foreign')).toBe(false);
    expect(second.tickets.slice(0, 10).map((ticket) => ticket.id)).toEqual(
      first.tickets.map((ticket) => ticket.id),
    );
  });
  it('shows legacy email tickets only for the same company and matching requester', async () => {
    const base = {
      tenantId,
      queueId,
      subject: 'Legacy email',
      requesterEmail: 'qa.portal@example.test',
    };
    await TicketModel.create([
      { ...base, number: 'QA-1', organisationId: orgId },
      { ...base, number: 'QA-2', organisationId: new Types.ObjectId() },
      { ...base, number: 'QA-3', organisationId: orgId, contactId: otherContactId },
    ]);
    const list = await runWithContext(context, () => portalTickets());
    expect(list.total).toBe(1);
    expect(list.tickets[0].number).toBe('QA-1');
  });
  it('honors ticket permission denial and disabled customer workspaces', async () => {
    await UserModel.updateOne(
      { _id: userId },
      { $set: { permissionDenials: ['ticket.read.own'] } },
    );
    await expect(runWithContext(context, portalIdentity)).rejects.toThrow();
    await UserModel.updateOne({ _id: userId }, { $set: { permissionDenials: [] } });
    await TenantModel.updateOne({ _id: tenantId }, { $set: { 'modules.tickets': false } });
    await expect(runWithContext(context, portalIdentity)).rejects.toThrow('not available');
  });
});
