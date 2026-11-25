import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { connectForTests, clearDatabase, disconnectFromTests } from '../setup';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { OrganisationModel } from '@coex/shared/crm/models/organisation.model';
import { ContactModel } from '@coex/shared/crm/models/contact.model';
import { QueueModel } from '@coex/shared/tickets/models/queue.model';
import { EmailSettingsModel } from '@coex/shared/core/models/email-settings.model';
import { EmailOutboxModel } from '@coex/shared/core/models/email-outbox.model';
import { hashPassword } from '@/lib/password';
import { runWithContext, type RequestContext } from '@/lib/tenant-context';
import { signInWithPassword, signInWithEntra } from '@/modules/core/services/auth.service';
import { resolveAuthenticatedUser } from '@/modules/core/services/auth-context.service';
import { requestLoginOtp, signInWithEmailOtp } from '@/modules/core/services/login-otp.service';
import {
  requestActivation,
  verifyActivation,
  finishActivation,
} from '@/modules/core/services/activation.service';
import {
  requestPasswordReset,
  resetLinkIsValid,
  resetPasswordWithToken,
} from '@/modules/core/services/password-reset.service';
import {
  portalTicket,
  portalTickets,
  raisePortalTicket,
  replyFromPortal,
  portalAttachment,
  provisionPortalAccount,
} from '@/modules/portal/service';
import { publicPortalTenant } from '@/modules/portal/tenant';
import { assertPortalFormTenant, portalPath, portalAuthPath } from '@coex/shared/core/portal-links';

const email = 'member@customer.test';
const passwordA = 'Meadow lantern cobalt river!';
const passwordB = 'Glacier amber silver orchard!';
let tenantA: Types.ObjectId;
let tenantB: Types.ObjectId;
let userA: Types.ObjectId;
let userB: Types.ObjectId;
let orgB: Types.ObjectId;
let adminB: RequestContext;
const contextA = () => ({ tenantId: tenantA, userId: userA, isPlatformAdmin: false });
const contextB = () => ({ tenantId: tenantB, userId: userB, isPlatformAdmin: false });
const originalSecret = process.env.AUTH_SECRET;
beforeAll(async () => {
  process.env.AUTH_SECRET = 'tenant-portal-qa-secret-'.repeat(3);
  await connectForTests('tenant_portal_auth');
});
beforeEach(async () => {
  await clearDatabase();
  for (const [slug, password] of [
    ['clinic-a', passwordA],
    ['clinic-b', passwordB],
  ] as const) {
    const tenant = await TenantModel.create({
      name: slug === 'clinic-a' ? 'Clinic A' : 'Clinic B',
      slug,
    });
    const org = await OrganisationModel.create({
      tenantId: tenant._id,
      name: 'Customer company',
      kind: 'client',
    });
    const user = await UserModel.create({
      tenantId: tenant._id,
      name: 'Nora Sample',
      email,
      role: 'client_contact',
      status: 'active',
      organisationId: org._id,
      passwordHash: await hashPassword(password),
    });
    await ContactModel.create({
      tenantId: tenant._id,
      organisationId: org._id,
      userId: user._id,
      name: user.name,
      email,
    });
    await QueueModel.create({ tenantId: tenant._id, name: 'General support', isDefault: true });
    await EmailSettingsModel.create({
      tenantId: tenant._id,
      outbound: {
        enabled: true,
        host: 'localhost',
        port: 2525,
        fromAddress: `${slug}@platform.test`,
      },
    });
    if (slug === 'clinic-a') {
      tenantA = tenant._id;
      userA = user._id;
    } else {
      tenantB = tenant._id;
      userB = user._id;
      orgB = org._id;
    }
  }
  const admin = await UserModel.create({
    tenantId: tenantB,
    name: 'Clinic B Admin',
    email: 'admin@clinic-b.test',
    role: 'tenant_admin',
    status: 'active',
  });
  adminB = { tenantId: tenantB, userId: admin._id, isPlatformAdmin: false };
});
afterAll(async () => {
  if (originalSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = originalSecret;
  await disconnectFromTests();
});
async function latestCode(tenantId: Types.ObjectId, subject: string) {
  const row = await EmailOutboxModel.findOne({ tenantId, subject }).sort({ createdAt: -1 });
  const code = row?.text.match(/code is (\d{6})/);
  expect(code).not.toBeNull();
  return code![1];
}

describe('tenant-specific portal authentication', () => {
  it('preserves unique legacy sign-in while emailing the canonical company link', async () => {
    await UserModel.deleteOne({ _id: userB });
    await requestLoginOtp(email);
    const code = await latestCode(tenantA, 'Your Worktello sign-in code');
    const mail = await EmailOutboxModel.findOne({ tenantId: tenantA });
    expect(mail?.text).toContain('/email-login?tenant=clinic-a');
    const session = await signInWithEmailOtp({ email, code });
    expect((await resolveAuthenticatedUser(session.token))?.tenantId).toBe(String(tenantA));
  });
  it('selects the company before checking a shared email, with no global fallback', async () => {
    expect((await signInWithPassword({ email, password: passwordA })).ok).toBe(false);
    for (const tenantSlug of ['', 'missing-company', '../clinic-a'])
      expect((await signInWithPassword({ email, password: passwordA, tenantSlug })).ok).toBe(false);
    const login = await signInWithPassword({
      email,
      password: passwordA,
      tenantSlug: 'clinic-a',
      accountKind: 'portal',
    });
    expect(login.ok).toBe(true);
    expect((await resolveAuthenticatedUser(login.token!))?.tenantId).toBe(String(tenantA));
    expect(
      (await signInWithPassword({ email, password: passwordA, tenantSlug: 'clinic-b' })).ok,
    ).toBe(false);
    const other = await signInWithPassword({ email, password: passwordB, tenantSlug: 'clinic-b' });
    expect((await resolveAuthenticatedUser(other.token!))?.tenantId).toBe(String(tenantB));
    expect(
      (
        await signInWithPassword({
          email,
          password: passwordA,
          tenantSlug: 'clinic-a',
          accountKind: 'staff',
        })
      ).ok,
    ).toBe(false);
  });
  it('keeps staff password and Microsoft sign-in separate from portal memberships', async () => {
    const staffTenant = await TenantModel.create({ name: 'Staff company', slug: 'staff-company' });
    await EmailSettingsModel.create({
      tenantId: staffTenant._id,
      outbound: {
        enabled: true,
        host: 'localhost',
        port: 2525,
        fromAddress: 'staff@platform.test',
      },
    });
    const staff = await UserModel.create({
      tenantId: staffTenant._id,
      name: 'Staff member',
      email,
      role: 'agent',
      status: 'active',
      passwordHash: await hashPassword(passwordA),
    });
    const login = await signInWithPassword({ email, password: passwordA, accountKind: 'staff' });
    expect((await resolveAuthenticatedUser(login.token!))?.id).toBe(String(staff._id));
    const sso = await signInWithEntra({ email, entraObjectId: 'verified-test-staff-object' });
    expect((await resolveAuthenticatedUser(sso.token!))?.id).toBe(String(staff._id));
    expect((await UserModel.findById(userA))?.entraObjectId).toBeNull();
    expect((await UserModel.findById(userB))?.entraObjectId).toBeNull();
    expect(await requestPasswordReset(email, undefined, 'staff')).toBe('sent');
    const reset = await EmailOutboxModel.findOne({ kind: 'password_reset' });
    expect(String(reset?.tenantId)).toBe(String(staffTenant._id));
    const token = reset!.text.match(/token=([A-Za-z0-9_-]+)/)![1];
    expect(await resetLinkIsValid(token, 'staff-company')).toBe(false);
    await expect(resetPasswordWithToken(token, passwordB, 'staff-company')).rejects.toThrow(
      /not active/,
    );
  });
  it('issues and consumes email sign-in codes only for the selected company', async () => {
    await requestLoginOtp(email);
    await requestLoginOtp(email, 'missing-company');
    expect(await EmailOutboxModel.countDocuments()).toBe(0);
    await requestLoginOtp(email, 'clinic-a');
    const codeA = await latestCode(tenantA, 'Your Worktello sign-in code');
    await expect(
      signInWithEmailOtp({ email, code: codeA, tenantSlug: 'clinic-b' }),
    ).rejects.toThrow(/invalid/);
    const session = await signInWithEmailOtp({ email, code: codeA, tenantSlug: 'clinic-a' });
    expect((await resolveAuthenticatedUser(session.token))?.tenantId).toBe(String(tenantA));
    await expect(
      signInWithEmailOtp({ email, code: codeA, tenantSlug: 'clinic-a' }),
    ).rejects.toThrow(/invalid/);
    await requestLoginOtp(email, 'clinic-b');
    expect((await EmailOutboxModel.findOne({ tenantId: tenantB }))?.text).toContain(
      '/email-login?tenant=clinic-b',
    );
  });
  it('binds activation codes and activation tokens to the same company', async () => {
    await UserModel.updateMany(
      { email },
      { $set: { status: 'invited', mustChangePassword: true, passwordHash: null } },
    );
    await requestActivation(email);
    expect(await EmailOutboxModel.countDocuments()).toBe(0);
    await requestActivation(email, 'clinic-a');
    const code = await latestCode(tenantA, 'Your Worktello activation code');
    await expect(verifyActivation(email, code, 'clinic-b')).rejects.toThrow(/invalid/);
    const token = await verifyActivation(email, code, 'clinic-a');
    await expect(finishActivation(token, passwordA, 'clinic-b')).rejects.toThrow(/expired/);
    await finishActivation(token, passwordA, 'clinic-a');
    expect((await UserModel.findById(userA))?.status).toBe('active');
    expect((await UserModel.findById(userB))?.status).toBe('invited');
    expect(
      (await signInWithPassword({ email, password: passwordA, tenantSlug: 'clinic-a' })).ok,
    ).toBe(true);
    expect((await EmailOutboxModel.findOne({ tenantId: tenantA }))?.text).toContain(
      '/activate?tenant=clinic-a',
    );
  });
  it('binds reset links to their original company and changes no other membership', async () => {
    expect(await requestPasswordReset(email)).toBe('no_account');
    expect(await requestPasswordReset(email, 'missing-company')).toBe('no_account');
    expect(await requestPasswordReset(email, 'clinic-a')).toBe('sent');
    const mail = await EmailOutboxModel.findOne({ tenantId: tenantA, kind: 'password_reset' });
    expect(mail?.text).toContain('/reset-password?tenant=clinic-a&token=');
    const token = mail!.text.match(/token=([A-Za-z0-9_-]+)/)![1];
    expect(await resetLinkIsValid(token, 'clinic-a')).toBe(true);
    expect(await resetLinkIsValid(token, 'clinic-b')).toBe(false);
    await expect(resetPasswordWithToken(token, passwordB, 'clinic-b')).rejects.toThrow(/expired/);
    await resetPasswordWithToken(token, passwordB, 'clinic-a');
    expect(
      (await signInWithPassword({ email, password: passwordA, tenantSlug: 'clinic-a' })).ok,
    ).toBe(false);
    expect(
      (await signInWithPassword({ email, password: passwordB, tenantSlug: 'clinic-a' })).ok,
    ).toBe(true);
    expect(
      (await signInWithPassword({ email, password: passwordB, tenantSlug: 'clinic-b' })).ok,
    ).toBe(true);
  });
  it('refuses disabled, suspended or deleted company portals', async () => {
    await TenantModel.updateOne({ _id: tenantA }, { $set: { 'modules.tickets': false } });
    expect(await publicPortalTenant('clinic-a')).toBeNull();
    expect(
      (await signInWithPassword({ email, password: passwordA, tenantSlug: 'clinic-a' })).ok,
    ).toBe(false);
    await TenantModel.updateOne({ _id: tenantB }, { $set: { status: 'suspended' } });
    expect(await publicPortalTenant('clinic-b')).toBeNull();
    await requestLoginOtp(email, 'clinic-b');
    expect(await EmailOutboxModel.countDocuments()).toBe(0);
  });
});

describe('portal memberships and tenant-bound records', () => {
  it('invites an existing email into another company without repurposing its original account', async () => {
    const contact = await ContactModel.create({
      tenantId: tenantB,
      organisationId: orgB,
      name: 'Another membership',
      email: 'invited@customer.test',
    });
    const original = await UserModel.create({
      tenantId: tenantA,
      email: 'invited@customer.test',
      name: 'Original account',
      role: 'client_contact',
      status: 'active',
      passwordHash: await hashPassword(passwordA),
    });
    const result = await runWithContext(adminB, () => provisionPortalAccount(String(contact._id)));
    expect(result.activationUrl).toContain('/activate?tenant=clinic-b');
    expect(result.emailQueued).toBe(true);
    expect('password' in result).toBe(false);
    const linked = await ContactModel.findById(contact._id);
    const invited = await UserModel.findById(linked?.userId).select('+passwordHash');
    expect(String(invited?.tenantId)).toBe(String(tenantB));
    expect(invited?.status).toBe('invited');
    expect(invited?.passwordHash).toBeNull();
    expect((await UserModel.findById(original._id))?.status).toBe('active');
    expect(await UserModel.countDocuments({ email: contact.email })).toBe(2);
    const invitation = await EmailOutboxModel.findOne({ kind: 'portal_invitation' });
    expect(String(invitation?.tenantId)).toBe(String(tenantB));
    expect(invitation?.text).toContain('/portal/clinic-b');
  });
  it('keeps ticket reads, replies, files and creation inside the authenticated tenant despite shared email', async () => {
    const ticket = await runWithContext(contextA(), () =>
      raisePortalTicket({
        subject: 'Only Clinic A',
        body: 'Private A request',
        files: [
          { fileName: 'qa.txt', contentType: 'text/plain', body: Buffer.from('Private A file') },
        ],
      }),
    );
    expect((await runWithContext(contextA(), () => portalTickets())).total).toBe(1);
    expect((await runWithContext(contextB(), () => portalTickets())).total).toBe(0);
    expect(await runWithContext(contextB(), () => portalTicket(ticket.id))).toBeNull();
    await expect(
      runWithContext(contextB(), () => replyFromPortal(ticket.id, 'Cross-tenant reply')),
    ).rejects.toThrow(/not found/);
    const view = await runWithContext(contextA(), () => portalTicket(ticket.id));
    const attachment = view!.messages[0].attachments[0];
    expect(
      await runWithContext(contextB(), () => portalAttachment(ticket.id, attachment.id)),
    ).toBeNull();
    const file = await runWithContext(contextA(), () => portalAttachment(ticket.id, attachment.id));
    expect(file?.body.toString()).toBe('Private A file');
  });
  it('rejects a stale form from a different company or a missing tenant stamp', () => {
    expect(() => assertPortalFormTenant(String(tenantA), String(tenantA))).not.toThrow();
    expect(() => assertPortalFormTenant(String(tenantB), String(tenantA))).toThrow(
      /another company/,
    );
    expect(() => assertPortalFormTenant(String(tenantA), null)).toThrow(/another company/);
    expect(portalPath('clinic-a')).toBe('/portal/clinic-a');
    expect(portalAuthPath('/login', 'clinic-a')).toBe('/login?tenant=clinic-a');
  });
});
