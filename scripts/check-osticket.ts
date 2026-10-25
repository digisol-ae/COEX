import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { connectToDatabase } from '../apps/web/src/lib/db';
import { runWithContext } from '../apps/web/src/lib/tenant-context';
import { UserModel } from '@coex/shared/core/models/user.model';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { ContactModel } from '@coex/shared/crm/models/contact.model';
import { TicketModel } from '@coex/shared/tickets/models/ticket.model';
import { TicketMessageModel } from '@coex/shared/tickets/models/ticket-message.model';
import { EmailSettingsModel } from '@coex/shared/core/models/email-settings.model';
import { EmailOutboxModel } from '@coex/shared/core/models/email-outbox.model';
import { ActivationModel } from '@coex/shared/core/models/activation.model';
import {
  requestActivation,
  verifyActivation,
  finishActivation,
} from '../apps/web/src/modules/core/services/activation.service';
import {
  portalTickets,
  portalTicket,
  raisePortalTicket,
  replyFromPortal,
} from '../apps/web/src/modules/portal/service';
import { verifyPassword } from '../apps/web/src/lib/password';
async function main() {
  const uri = new URL(process.env.MONGODB_URI ?? '');
  assert.equal(uri.hostname, 'mongo');
  assert.equal(uri.pathname, '/coex_test_ost_auth');
  await connectToDatabase();
  await ActivationModel.init();
  const tenant = await TenantModel.create({
    name: 'QA osTicket Migration',
    slug: 'qa-ost-' + Date.now(),
  });
  await EmailSettingsModel.create({ tenantId: tenant._id, outbound: { enabled: true } });
  const user = await UserModel.create({
    tenantId: tenant._id,
    name: 'QA Imported Person',
    email: `qa-ost-${Date.now()}@example.test`,
    role: 'client_contact',
    status: 'invited',
    mustChangePassword: true,
    legacySourceId: 'osticket:qa',
  });
  const contact = await ContactModel.create({
    tenantId: tenant._id,
    organisationId: null,
    userId: user._id,
    name: user.name,
    email: user.email,
  });
  await requestActivation('unknown@example.test');
  assert.equal(await ActivationModel.countDocuments({ userId: user._id }), 0);
  await requestActivation(user.email);
  const mail = await EmailOutboxModel.findOne({ tenantId: tenant._id });
  assert(mail, 'Activation mail must queue');
  const code = mail.text.match(/\b\d{6}\b/)?.[0];
  assert(code);
  await requestActivation(user.email);
  assert.equal(
    await EmailOutboxModel.countDocuments({ tenantId: tenant._id }),
    1,
    'Resend bounded',
  );
  await assert.rejects(() => verifyActivation(user.email, '000000'));
  const token = await verifyActivation(user.email, code);
  await assert.rejects(() => verifyActivation(user.email, code), 'Code cannot be reused');
  await assert.rejects(() => finishActivation(token, 'short'), 'Password policy');
  await finishActivation(token, 'QA-Account-Long-Phrase-2026!');
  await assert.rejects(
    () => finishActivation(token, 'Another-Long-Phrase-2026!'),
    'Activation cannot be reused',
  );
  const activated = await UserModel.findById(user._id).select('+passwordHash');
  assert.equal(activated?.status, 'active');
  assert(await verifyPassword('QA-Account-Long-Phrase-2026!', activated!.passwordHash!));
  const ticket = await TicketModel.create({
    tenantId: tenant._id,
    queueId: new mongoose.Types.ObjectId(),
    number: 'QA-own',
    subject: 'Own historical ticket',
    contactId: contact._id,
    organisationId: null,
    requesterEmail: user.email,
  });
  const other = await TicketModel.create({
    tenantId: tenant._id,
    queueId: new mongoose.Types.ObjectId(),
    number: 'QA-other',
    subject: 'Other person',
    contactId: new mongoose.Types.ObjectId(),
    organisationId: null,
    requesterEmail: 'other@example.test',
  });
  await TicketMessageModel.create([
    {
      tenantId: tenant._id,
      ticketId: ticket._id,
      visibility: 'public',
      direction: 'outbound',
      body: 'Public reply',
      authorName: 'QA Staff',
    },
    {
      tenantId: tenant._id,
      ticketId: ticket._id,
      visibility: 'internal',
      direction: 'outbound',
      body: 'Private note',
      authorName: 'QA Staff',
    },
  ]);
  const context = { tenantId: tenant._id, userId: user._id, isPlatformAdmin: false };
  await runWithContext(context, async () => {
    assert.equal((await portalTickets()).total, 1);
    assert.equal((await portalTicket(String(ticket._id)))?.messages.length, 1);
    assert.equal(await portalTicket(String(other._id)), null);
    await replyFromPortal(String(ticket._id), 'QA own-ticket reply');
    assert.equal((await portalTicket(String(ticket._id)))?.messages.length, 2);
    await assert.rejects(
      () => raisePortalTicket({ subject: 'Test', body: 'New ticket' }),
      /link your customer/,
    );
  });
  // Attempt exhaustion cannot be bypassed by the correct code.
  const locked = await UserModel.create({
    tenantId: tenant._id,
    name: 'QA Attempts',
    email: `qa-attempts-${Date.now()}@example.test`,
    role: 'client_contact',
    status: 'invited',
    mustChangePassword: true,
    legacySourceId: 'osticket:attempts',
  });
  await requestActivation(locked.email);
  const lockedMail = await EmailOutboxModel.findOne({ tenantId: tenant._id, to: locked.email });
  const lockedCode = lockedMail!.text.match(/\b\d{6}\b/)![0];
  for (let i = 0; i < 5; i++) await assert.rejects(() => verifyActivation(locked.email, '000000'));
  await assert.rejects(() => verifyActivation(locked.email, lockedCode));
  await ActivationModel.updateOne(
    { userId: locked._id },
    { $set: { attempts: 0, expiresAt: new Date(Date.now() - 1000) } },
  );
  await assert.rejects(() => verifyActivation(locked.email, lockedCode));
  const concurrent = await UserModel.create({
    tenantId: tenant._id,
    name: 'QA Concurrent',
    email: `qa-concurrent-${Date.now()}@example.test`,
    role: 'client_contact',
    status: 'invited',
    mustChangePassword: true,
    legacySourceId: 'osticket:concurrent',
  });
  await Promise.all([requestActivation(concurrent.email), requestActivation(concurrent.email)]);
  assert.equal(
    await EmailOutboxModel.countDocuments({ tenantId: tenant._id, to: concurrent.email }),
    1,
  );
  const concurrentMail = await EmailOutboxModel.findOne({
    tenantId: tenant._id,
    to: concurrent.email,
  });
  const concurrentCode = concurrentMail!.text.match(/\b\d{6}\b/)![0];
  const outcomes = await Promise.allSettled([
    verifyActivation(concurrent.email, concurrentCode),
    verifyActivation(concurrent.email, concurrentCode),
  ]);
  assert.equal(outcomes.filter((x) => x.status === 'fulfilled').length, 1);
  console.log(
    'PASS: OTP send/resend, invalid code, code replay, password policy, token replay, activation, attempt limit, unassigned own-ticket access, other-ticket denial, internal-note privacy, new-ticket guard.',
  );
  await mongoose.disconnect();
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : 'Check failed');
  process.exitCode = 1;
  void mongoose.disconnect();
});
