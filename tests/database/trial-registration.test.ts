import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectForTests, clearDatabase, disconnectFromTests } from '../setup';
import { runWithContext, type RequestContext } from '@/lib/tenant-context';
import {
  applyForTrial,
  verifyTrialEmail,
  reviewTrialApplication,
  listTrialApplications,
  activateTrialAdministrator,
  trialActivationValid,
  resendTrialActivation,
  setRegistrationEnabled,
  registrationAvailability,
} from '@/modules/core/services/trial-registration.service';
import { signInWithPassword } from '@/modules/core/services/auth.service';
import { resolveAuthenticatedUser } from '@/modules/core/services/auth-context.service';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { QueueModel } from '@coex/shared/tickets/models/queue.model';
import { TrialApplicationModel } from '@coex/shared/core/models/trial-application.model';
import { PlatformSettingsModel } from '@coex/shared/core/models/platform-settings.model';
import { EmailSettingsModel } from '@coex/shared/core/models/email-settings.model';
import { EmailOutboxModel } from '@coex/shared/core/models/email-outbox.model';
import { AuditLogModel } from '@coex/shared/core/models/audit-log.model';
import { DAY_MS } from '@coex/shared/core/saas';

const originalSecret = process.env.AUTH_SECRET;
const originalUrl = process.env.COEX_APP_URL;
let owner: RequestContext;
const input = {
  companyName: 'Example clinic',
  adminName: 'Mira Jones',
  email: 'mira@clinic.test',
  slug: 'example-clinic',
};
const password = 'Meadow lantern cobalt river!';
const asOwner = <T>(work: () => T) => runWithContext(owner, work);
async function tokenFromMail(subject: string, path: string) {
  const mail = await EmailOutboxModel.findOne({ subject }).sort({ createdAt: -1 });
  expect(mail?.kind).toBe('trial_registration');
  expect(String(mail?.tenantId)).toBe(String(owner.tenantId));
  const match = mail?.text.match(new RegExp(`${path}\\?token=([A-Za-z0-9_-]{43})`));
  expect(match).not.toBeNull();
  return match![1];
}
async function pendingApplication() {
  await applyForTrial(input, 'qa-ip');
  const token = await tokenFromMail('Verify your Worktello trial application', '/register/verify');
  await verifyTrialEmail(token);
  return (await TrialApplicationModel.findOne({ email: input.email }))!;
}
async function approvedApplication() {
  const app = await pendingApplication();
  await asOwner(() => reviewTrialApplication(String(app._id), 'approve', 'Evaluation approved'));
  return {
    app: (await TrialApplicationModel.findById(app._id))!,
    token: await tokenFromMail('Your Worktello trial is approved', '/register/activate'),
  };
}
beforeAll(async () => {
  process.env.AUTH_SECRET = 'registration-test-secret-'.repeat(3);
  process.env.COEX_APP_URL = 'http://localhost:3119';
  await connectForTests('trial_registration');
});
beforeEach(async () => {
  await clearDatabase();
  const tenant = await TenantModel.create({ name: 'Platform', slug: 'platform' });
  const actor = await UserModel.create({
    tenantId: tenant._id,
    name: 'Owner',
    email: 'owner@platform.test',
    role: 'platform_admin',
  });
  owner = { tenantId: tenant._id, userId: actor._id, isPlatformAdmin: true };
  await EmailSettingsModel.create({
    tenantId: tenant._id,
    outbound: {
      enabled: true,
      host: 'localhost',
      port: 2525,
      fromAddress: 'registration@platform.test',
    },
  });
  await asOwner(() => setRegistrationEnabled(true));
});
afterAll(async () => {
  if (originalSecret === undefined) delete process.env.AUTH_SECRET;
  else process.env.AUTH_SECRET = originalSecret;
  if (originalUrl === undefined) delete process.env.COEX_APP_URL;
  else process.env.COEX_APP_URL = originalUrl;
  await disconnectFromTests();
});

describe('verified trial intake', () => {
  it('queues verification without creating a tenant or user and keeps tokens out of owner summaries', async () => {
    await applyForTrial(input, 'qa-ip');
    const app = await TrialApplicationModel.findOne({ email: input.email });
    expect(app?.status).toBe('unverified');
    expect(app?.verificationTokenHash).toBeUndefined();
    expect(await TenantModel.countDocuments()).toBe(1);
    expect(await UserModel.countDocuments()).toBe(1);
    const summaries = await asOwner(listTrialApplications);
    expect(JSON.stringify(summaries)).not.toContain('Token');
  });
  it('requires verification and never provisions through the future automatic-mode flag', async () => {
    await applyForTrial(input, 'qa-ip');
    const app = await TrialApplicationModel.findOne({ email: input.email });
    await expect(
      asOwner(() => reviewTrialApplication(String(app!._id), 'approve', '')),
    ).rejects.toThrow(/verified/);
    await PlatformSettingsModel.updateOne(
      { key: 'platform' },
      { $set: { registrationMode: 'automatic' } },
    );
    const token = await tokenFromMail(
      'Verify your Worktello trial application',
      '/register/verify',
    );
    await verifyTrialEmail(token);
    expect((await TrialApplicationModel.findById(app!._id))?.status).toBe('pending');
    expect(await TenantModel.countDocuments()).toBe(1);
    await expect(verifyTrialEmail(token)).rejects.toThrow(/already used/);
  });
  it('rejects invalid and expired verification links', async () => {
    await applyForTrial(input, 'qa-ip');
    const token = await tokenFromMail(
      'Verify your Worktello trial application',
      '/register/verify',
    );
    await TrialApplicationModel.updateOne(
      { email: input.email },
      { $set: { verificationExpiresAt: new Date(0) } },
    );
    await expect(verifyTrialEmail(token)).rejects.toThrow(/expired/);
    await expect(verifyTrialEmail('invalid')).rejects.toThrow(/invalid/);
  });
  it('deduplicates concurrent applications and suppresses existing-account disclosure', async () => {
    await Promise.all([applyForTrial(input, 'qa-ip'), applyForTrial(input, 'qa-ip')]);
    expect(await TrialApplicationModel.countDocuments()).toBe(1);
    expect(await EmailOutboxModel.countDocuments({ kind: 'trial_registration' })).toBe(1);
    await applyForTrial({ ...input, email: 'owner@platform.test' }, 'qa-ip');
    expect(await TrialApplicationModel.countDocuments()).toBe(1);
  });
  it('enforces email and IP limits without accepting unbounded intake', async () => {
    for (let i = 0; i < 3; i++) await applyForTrial(input, 'qa-ip');
    await expect(applyForTrial(input, 'different-ip')).rejects.toThrow(/Too many/);
    for (let i = 0; i < 7; i++)
      await applyForTrial(
        { ...input, slug: `clinic-${i}`, email: `person${i}@clinic.test` },
        'qa-ip',
      );
    await expect(
      applyForTrial({ ...input, slug: 'last-clinic', email: 'last@clinic.test' }, 'qa-ip'),
    ).rejects.toThrow(/Too many/);
  });
  it('closes intake safely and rolls back application writes if mail is unavailable', async () => {
    await asOwner(() => setRegistrationEnabled(false));
    expect((await registrationAvailability()).available).toBe(false);
    await expect(applyForTrial(input, 'qa-ip')).rejects.toThrow(/closed/);
    await EmailSettingsModel.updateOne(
      { tenantId: owner.tenantId },
      { $set: { 'outbound.enabled': false } },
    );
    await expect(asOwner(() => setRegistrationEnabled(true))).rejects.toThrow(/Configure/);
    expect(await TrialApplicationModel.countDocuments()).toBe(0);
  });
});

describe('owner approval and secure activation', () => {
  it('creates the isolated tenant only at approval with default trial and storage', async () => {
    const { app, token } = await approvedApplication();
    const tenant = await TenantModel.findById(app.tenantId);
    expect(tenant?.commercial?.status).toBe('trialing');
    expect(
      tenant!.commercial!.trialEndsAt!.getTime() - tenant!.commercial!.startedAt!.getTime(),
    ).toBe(30 * DAY_MS);
    expect(tenant?.storageLimitBytes).toBe(2_000_000_000);
    expect(await QueueModel.countDocuments({ tenantId: tenant!._id, isDefault: true })).toBe(1);
    const admin = await UserModel.findById(app.userId).select('+passwordHash');
    expect(admin?.status).toBe('invited');
    expect(admin?.passwordHash).toBeNull();
    expect((await signInWithPassword({ email: input.email, password })).ok).toBe(false);
    expect(await trialActivationValid(token)).toBe(true);
    expect(await AuditLogModel.countDocuments({ action: 'trial_application.approved' })).toBe(1);
  });
  it('allows only one approval under concurrent owner actions', async () => {
    const app = await pendingApplication();
    const results = await asOwner(() =>
      Promise.allSettled([
        reviewTrialApplication(String(app._id), 'approve', ''),
        reviewTrialApplication(String(app._id), 'approve', ''),
      ]),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(await TenantModel.countDocuments({ slug: input.slug })).toBe(1);
    expect(
      await EmailOutboxModel.countDocuments({ subject: 'Your Worktello trial is approved' }),
    ).toBe(1);
  });
  it('rolls approval back instead of stranding a tenant when email cannot be queued', async () => {
    const app = await pendingApplication();
    await EmailSettingsModel.updateOne(
      { tenantId: owner.tenantId },
      { $set: { 'outbound.enabled': false } },
    );
    await expect(
      asOwner(() => reviewTrialApplication(String(app._id), 'approve', '')),
    ).rejects.toThrow(/email is unavailable/);
    expect(await TenantModel.countDocuments({ slug: input.slug })).toBe(0);
    expect(await UserModel.countDocuments({ email: input.email })).toBe(0);
    expect((await TrialApplicationModel.findById(app._id))?.status).toBe('pending');
  });
  it('rejects with an explanation without creating a workspace', async () => {
    const app = await pendingApplication();
    await expect(
      asOwner(() => reviewTrialApplication(String(app._id), 'reject', '')),
    ).rejects.toThrow(/rejection reason/);
    await asOwner(() =>
      reviewTrialApplication(String(app._id), 'reject', 'Please provide your company details.'),
    );
    expect(await TenantModel.countDocuments()).toBe(1);
    expect(
      (await EmailOutboxModel.findOne({ subject: 'Update on your Worktello trial application' }))
        ?.text,
    ).toContain('Please provide');
    await expect(
      asOwner(() => reviewTrialApplication(String(app._id), 'approve', '')),
    ).rejects.toThrow(/verified/);
  });
  it('blocks tenant administrators from listing, changing settings or reviewing applications', async () => {
    const app = await pendingApplication();
    await UserModel.updateOne({ _id: owner.userId }, { $set: { role: 'tenant_admin' } });
    await expect(asOwner(listTrialApplications)).rejects.toThrow(/platform owner/);
    await expect(asOwner(() => setRegistrationEnabled(true))).rejects.toThrow(/platform owner/);
    await expect(
      asOwner(() => reviewTrialApplication(String(app._id), 'approve', '')),
    ).rejects.toThrow(/platform owner/);
  });
  it('activates once with a strong password and signs in only to the approved tenant', async () => {
    const { app, token } = await approvedApplication();
    await expect(activateTrialAdministrator(token, 'short')).rejects.toThrow(/12 characters/);
    expect(await trialActivationValid(token)).toBe(true);
    await activateTrialAdministrator(token, password);
    expect(await trialActivationValid(token)).toBe(false);
    await expect(activateTrialAdministrator(token, password)).rejects.toThrow(/already used/);
    const login = await signInWithPassword({ email: input.email, password });
    expect(login.ok).toBe(true);
    const actor = await resolveAuthenticatedUser(login.token!);
    expect(actor?.tenantId).toBe(String(app.tenantId));
    expect(actor?.permissions).not.toContain('tenant.create');
    expect(await AuditLogModel.countDocuments({ action: 'trial_administrator.activated' })).toBe(1);
  });
  it('reissues expired activation links and invalidates the previous token', async () => {
    const { app, token } = await approvedApplication();
    await TrialApplicationModel.updateOne(
      { _id: app._id },
      { $set: { activationExpiresAt: new Date(0) } },
    );
    expect(await trialActivationValid(token)).toBe(false);
    await resendTrialActivation(input.email, 'qa-ip');
    const next = await tokenFromMail(
      'Activate your Worktello administrator account',
      '/register/activate',
    );
    expect(await trialActivationValid(next)).toBe(true);
    await expect(activateTrialAdministrator(token, password)).rejects.toThrow(/expired/);
    await activateTrialAdministrator(next, password);
    await resendTrialActivation(input.email, 'qa-ip');
    expect(
      await EmailOutboxModel.countDocuments({
        subject: 'Activate your Worktello administrator account',
      }),
    ).toBe(1);
  });
  it('does not activate suspended or deleted tenants', async () => {
    const { app, token } = await approvedApplication();
    await TenantModel.updateOne({ _id: app.tenantId }, { $set: { status: 'suspended' } });
    expect(await trialActivationValid(token)).toBe(false);
    await expect(activateTrialAdministrator(token, password)).rejects.toThrow(/unavailable/);
    expect((await UserModel.findById(app.userId))?.status).toBe('invited');
  });
});
