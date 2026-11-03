import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { connectForTests, clearDatabase, disconnectFromTests } from '../setup';
import { runWithContext } from '@/lib/tenant-context';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { EmailSettingsModel } from '@coex/shared/core/models/email-settings.model';
import { EmailOutboxModel } from '@coex/shared/core/models/email-outbox.model';
import { ResourceShareModel, ResourceAccessModel } from '@coex/shared/resources/models';
import { ContactModel } from '@coex/shared/crm/models/contact.model';
import { createOrganisation } from '@/modules/crm/services/organisation.service';
import { createQueue } from '@/modules/tickets/services/queue.service';
import { createTicket, getTicketDetail } from '@/modules/tickets/services/ticket.service';
import {
  saveResource,
  listResources,
  createResourceShare,
  publicShare,
  verifyResourceOtp,
  verifiedShare,
  sharedDocument,
  resendResourceOtp,
  revokeResourceShare,
  publicResources,
  resourceRecipients,
  shareHistory,
} from '@/modules/resources/service';
const context = {
  tenantId: new Types.ObjectId(),
  userId: new Types.ObjectId(),
  isPlatformAdmin: false,
};
const other = { ...context, tenantId: new Types.ObjectId() };
const actor = {
  id: String(context.userId),
  permissions: ['customer.read', 'ticket.read.all', 'ticket.manage'],
};
const within = <T>(fn: () => Promise<T>) => runWithContext(context, fn);
let customer: string;
let resource: string;
const pdf = Buffer.from('%PDF-1.4\nQA document');
beforeAll(async () => {
  process.env.AUTH_SECRET = 'resources-test-only-secret';
  process.env.COEX_APP_URL = 'https://worktello.example';
  await connectForTests('resources');
});
afterAll(disconnectFromTests);
beforeEach(async () => {
  await clearDatabase();
  await TenantModel.create({ _id: context.tenantId, name: 'Resource QA', slug: 'resources-qa' });
  await UserModel.create({
    _id: context.userId,
    tenantId: context.tenantId,
    name: 'QA Agent',
    email: 'agent@example.test',
    role: 'tenant_admin',
  });
  await EmailSettingsModel.create({ tenantId: context.tenantId, outbound: { enabled: true } });
  await within(async () => {
    customer = await createOrganisation({
      name: 'QA Customer',
      email: 'customer@example.test',
      kind: 'client',
    });
    resource = await saveResource({
      title: 'PDF guide',
      status: 'published',
      file: { name: 'guide.pdf', body: pdf },
    });
  });
});
async function share(overrides: Partial<Parameters<typeof createResourceShare>[0]> = {}) {
  const id = await within(() =>
    createResourceShare(
      {
        resourceIds: [resource],
        organisationId: customer,
        recipientEmail: 'customer@example.test',
        title: 'Your guides',
        requestKey: randomUUID(),
        ...overrides,
      },
      actor,
    ),
  );
  const mail = (await EmailOutboxModel.findOne({ kind: 'resource_share' }).sort({
    createdAt: -1,
    _id: -1,
  }))!;
  const token = /\/shared\/resources\/([\w-]{43})/.exec(mail.text)![1];
  const code = /One-time code: (\d{8})/.exec(mail.text)![1];
  return { id, token, code, mail };
}
describe('resource sharing', () => {
  it('defaults to 72 hours, queues the link and OTP together, and gates files without a login', async () => {
    const before = Date.now();
    const s = await share();
    const row = (await publicShare(s.token))!;
    expect(row.expiresAt.getTime() - before).toBeGreaterThanOrEqual(72 * 3600000);
    expect(row.expiresAt.getTime() - before).toBeLessThan(72 * 3600000 + 3000);
    expect(s.mail.to).toBe('customer@example.test');
    expect(s.mail.cc).toHaveLength(0);
    expect(await verifiedShare(s.token)).toBeNull();
    await expect(sharedDocument(s.token, undefined, resource, false)).rejects.toThrow(
      'unavailable',
    );
    const access = await verifyResourceOtp(s.token, s.code);
    expect(await verifiedShare(s.token, access.browserToken)).not.toBeNull();
    expect((await sharedDocument(s.token, access.browserToken, resource, true)).body).toEqual(pdf);
    expect((await within(shareHistory))[0].downloads).toBe(1);
    const stored = (await ResourceAccessModel.findOne({ shareId: s.id }))!;
    expect(stored.tokenHash).not.toBe(access.browserToken);
  });
  it('allows exactly one concurrent claim of an OTP and no replay', async () => {
    const s = await share();
    const results = await Promise.allSettled([
      verifyResourceOtp(s.token, s.code),
      verifyResourceOtp(s.token, s.code),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    await expect(verifyResourceOtp(s.token, s.code)).rejects.toThrow();
    expect(await ResourceAccessModel.countDocuments()).toBe(1);
  });
  it('limits guesses and requires a fresh emailed code on another browser without extending expiry', async () => {
    const s = await share({ hours: 2 });
    const original = (await publicShare(s.token))!.expiresAt;
    for (let i = 0; i < 5; i++)
      await expect(verifyResourceOtp(s.token, '00000000')).rejects.toThrow();
    await expect(verifyResourceOtp(s.token, s.code)).rejects.toThrow();
    await expect(resendResourceOtp(s.token)).rejects.toThrow('wait');
    await ResourceShareModel.updateOne(
      { _id: s.id },
      { $set: { otpSentAt: new Date(Date.now() - 61000) } },
    );
    await resendResourceOtp(s.token);
    const mail = (await EmailOutboxModel.findOne({ kind: 'resource_share' }).sort({
      createdAt: -1,
      _id: -1,
    }))!;
    const fresh = /One-time code: (\d{8})/.exec(mail.text)![1];
    const access = await verifyResourceOtp(s.token, fresh);
    expect(access.expiresAt).toEqual(original);
    expect(await verifiedShare(s.token)).toBeNull();
    expect(await verifiedShare(s.token, access.browserToken)).not.toBeNull();
    await expect(verifyResourceOtp(s.token, s.code)).rejects.toThrow();
  });
  it('keeps an already verified browser authorized after another browser requests a code', async () => {
    const s = await share();
    const access = await verifyResourceOtp(s.token, s.code);
    await ResourceShareModel.updateOne(
      { _id: s.id },
      { $set: { otpSentAt: new Date(Date.now() - 61000) } },
    );
    await resendResourceOtp(s.token);
    expect(await verifiedShare(s.token, access.browserToken)).not.toBeNull();
  });
  it('denies expired or revoked links and existing browser sessions', async () => {
    const s = await share();
    const access = await verifyResourceOtp(s.token, s.code);
    await within(() => revokeResourceShare(s.id));
    expect(await verifiedShare(s.token, access.browserToken)).toBeNull();
    await expect(sharedDocument(s.token, access.browserToken, resource, false)).rejects.toThrow();
    const next = await share();
    await ResourceShareModel.updateOne(
      { _id: next.id },
      { $set: { expiresAt: new Date(Date.now() - 1) } },
    );
    expect(await publicShare(next.token)).toBeNull();
    await expect(resendResourceOtp(next.token)).rejects.toThrow();
  });
  it('does not let a token, browser credential or file escape its selected resources', async () => {
    const s = await share();
    const access = await verifyResourceOtp(s.token, s.code);
    const second = await share();
    expect(await verifiedShare(second.token, access.browserToken)).toBeNull();
    const unshared = await within(() =>
      saveResource({
        title: 'Not shared',
        status: 'published',
        file: { name: 'private.pdf', body: pdf },
      }),
    );
    await expect(sharedDocument(s.token, access.browserToken, unshared, false)).rejects.toThrow();
    expect(await publicShare('x'.repeat(43))).toBeNull();
  });
  it('isolates tenant content, sharing history, recipients, edits and revocation', async () => {
    const s = await share();
    await runWithContext(other, async () => {
      expect(await listResources()).toHaveLength(0);
      expect(await shareHistory()).toHaveLength(0);
      expect(await resourceRecipients('customer')).toHaveLength(0);
      await expect(saveResource({ id: resource, title: 'Foreign edit' })).rejects.toThrow(
        'not found',
      );
      await expect(revokeResourceShare(s.id)).rejects.toThrow();
      await expect(
        createResourceShare(
          {
            resourceIds: [resource],
            organisationId: customer,
            recipientEmail: 'customer@example.test',
            title: 'Foreign',
            requestKey: randomUUID(),
          },
          actor,
        ),
      ).rejects.toThrow('not found');
    });
  });
  it('refuses drafts, unknown recipients, other-customer contacts and duplicate submits', async () => {
    const draft = await within(() =>
      saveResource({ title: 'Draft', videoUrl: 'https://youtu.be/dQw4w9WgXcQ' }),
    );
    await expect(share({ resourceIds: [draft] })).rejects.toThrow('published');
    await expect(share({ recipientEmail: 'stranger@example.test' })).rejects.toThrow(
      'existing contact',
    );
    await ContactModel.create({
      tenantId: context.tenantId,
      organisationId: new Types.ObjectId(),
      name: 'Another customer',
      email: 'other@example.test',
    });
    await expect(share({ recipientEmail: 'other@example.test' })).rejects.toThrow(
      'existing contact',
    );
    const requestKey = randomUUID();
    const first = await share({ requestKey });
    const second = await share({ requestKey });
    expect(first.id).toBe(second.id);
    expect(await EmailOutboxModel.countDocuments({ kind: 'resource_share' })).toBe(1);
  });
  it('fails closed when email is disabled, and archive/suspension immediately stops access', async () => {
    await EmailSettingsModel.updateOne(
      { tenantId: context.tenantId },
      { $set: { 'outbound.enabled': false } },
    );
    await expect(share()).rejects.toThrow('disabled');
    expect(await EmailOutboxModel.countDocuments({ kind: 'resource_share' })).toBe(0);
    await EmailSettingsModel.updateOne(
      { tenantId: context.tenantId },
      { $set: { 'outbound.enabled': true } },
    );
    const s = await share();
    const access = await verifyResourceOtp(s.token, s.code);
    await within(() => saveResource({ id: resource, title: 'Archived', status: 'archived' }));
    expect((await publicResources(s.token, access.browserToken)).resources).toHaveLength(0);
    await expect(sharedDocument(s.token, access.browserToken, resource, false)).rejects.toThrow();
    await TenantModel.updateOne({ _id: context.tenantId }, { $set: { status: 'suspended' } });
    expect(await verifiedShare(s.token, access.browserToken)).toBeNull();
  });
  it('shares through an accessible customer ticket without posting the OTP in the conversation', async () => {
    await within(async () => {
      const queueId = await createQueue({ name: 'Support' });
      const { id } = await createTicket({
        queueId,
        organisationId: customer,
        subject: 'Help',
        body: 'Please help',
        channel: 'agent',
      });
      await EmailOutboxModel.deleteMany({});
      const s = await share({ ticketId: id });
      const detail = (await getTicketDetail(id))!;
      const reply = detail.messages.find((m) => m.body.includes('/shared/resources/'))!;
      expect(reply.body).toContain(s.token);
      expect(reply.body).not.toContain(s.code);
      expect(s.mail.cc).toHaveLength(0);
      expect(s.mail.to).toBe('customer@example.test');
      await expect(
        createResourceShare(
          {
            resourceIds: [resource],
            organisationId: customer,
            recipientEmail: 'customer@example.test',
            title: 'Forbidden',
            ticketId: id,
            requestKey: randomUUID(),
          },
          { id: new Types.ObjectId().toString(), permissions: ['ticket.manage'] },
        ),
      ).rejects.toThrow('not found');
    });
  });
});

it('enforces customer-directory permission and deduplicates concurrent share submits', async () => {
  const input = {
    resourceIds: [resource],
    organisationId: customer,
    recipientEmail: 'customer@example.test',
    title: 'Concurrent share',
    requestKey: randomUUID(),
  };
  await expect(
    within(() => createResourceShare(input, { ...actor, permissions: ['resource.share'] })),
  ).rejects.toThrow('Customer read permission');
  const results = await Promise.allSettled([
    within(() => createResourceShare(input, actor)),
    within(() => createResourceShare(input, actor)),
  ]);
  expect(results.some((r) => r.status === 'fulfilled')).toBe(true);
  expect(await ResourceShareModel.countDocuments()).toBe(1);
  expect(await EmailOutboxModel.countDocuments({ kind: 'resource_share' })).toBe(1);
});
it('caps OTP resends and never extends the original expiry', async () => {
  const s = await share();
  const expiry = (await publicShare(s.token))!.expiresAt;
  await ResourceShareModel.updateOne(
    { _id: s.id },
    { $set: { otpSendCount: 10, otpSentAt: new Date(Date.now() - 61000) } },
  );
  await expect(resendResourceOtp(s.token)).rejects.toThrow('ten codes');
  expect((await publicShare(s.token))!.expiresAt).toEqual(expiry);
  expect(await EmailOutboxModel.countDocuments({ kind: 'resource_share' })).toBe(1);
});
