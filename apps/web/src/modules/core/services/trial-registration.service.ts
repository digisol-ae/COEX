import { createHash, createHmac, randomBytes } from 'node:crypto';
import { Types, type ClientSession } from 'mongoose';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { runWithContext } from '@/lib/tenant-context';
import { hashPassword } from '@/lib/password';
import { passwordProblem } from '@coex/shared/core/password-policy';
import { DAY_MS } from '@coex/shared/core/saas';
import { TrialApplicationModel } from '@coex/shared/core/models/trial-application.model';
import { RegistrationRateModel } from '@coex/shared/core/models/registration-rate.model';
import { PlatformSettingsModel } from '@coex/shared/core/models/platform-settings.model';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { QueueModel } from '@coex/shared/tickets/models/queue.model';
import { AuditLogModel } from '@coex/shared/core/models/audit-log.model';
import { provisioningDefaults } from './platform-settings.service';
import { requirePlatformAdministrator } from './platform-access.service';
import { appBaseUrl, queueEmail, registrationSenderReady } from './email.service';
import { recordAudit } from './audit.service';

const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const newToken = () => randomBytes(32).toString('base64url');
const validToken = (token: string) => /^[A-Za-z0-9_-]{43}$/.test(token);
const reserved = new Set([
  'app',
  'api',
  'www',
  'admin',
  'login',
  'portal',
  'support',
  'setup',
  'register',
  'worktello',
  'new',
  'tickets',
  'profile',
]);
const inputSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  adminName: z.string().trim().min(1).max(200),
  email: z.email().trim().toLowerCase().max(254),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(2)
    .max(40),
});

function publicConfigurationReady() {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) return false;
  if (!process.env.COEX_APP_URL && !process.env.AUTH_URL) return false;
  try {
    const url = new URL(appBaseUrl());
    return (
      !url.username &&
      !url.password &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash &&
      (url.protocol === 'https:' ||
        (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
    );
  } catch {
    return false;
  }
}

export async function registrationAvailability() {
  await connectToDatabase();
  const settings = await PlatformSettingsModel.findOne({ key: 'platform' });
  const available = Boolean(
    settings?.registrationEnabled &&
    settings.registrationEmailTenantId &&
    publicConfigurationReady() &&
    (await TenantModel.exists({
      _id: settings.registrationEmailTenantId,
      status: 'active',
      deletedAt: null,
    })) &&
    (await registrationSenderReady(String(settings.registrationEmailTenantId))),
  );
  return { available };
}

export async function getRegistrationControls() {
  const actor = await requirePlatformAdministrator();
  const settings = await PlatformSettingsModel.findOne({ key: 'platform' });
  return {
    enabled: settings?.registrationEnabled ?? false,
    senderReady: await registrationSenderReady(String(actor.tenantId)),
    publicConfigurationReady: publicConfigurationReady(),
    mode: 'approval_required' as const,
  };
}

export async function setRegistrationEnabled(enabled: boolean) {
  const actor = await requirePlatformAdministrator();
  if (
    enabled &&
    (!publicConfigurationReady() || !(await registrationSenderReady(String(actor.tenantId))))
  )
    throw new Error(
      'Configure this workspace’s outgoing email, the public app URL and AUTH_SECRET before opening registration.',
    );
  await PlatformSettingsModel.findOneAndUpdate(
    { key: 'platform' },
    {
      $set: {
        registrationEnabled: enabled,
        registrationMode: 'approval_required',
        registrationEmailTenantId: actor.tenantId,
      },
    },
    { upsert: true, runValidators: true },
  );
  await recordAudit({
    action: 'platform.registration_updated',
    entityType: 'PlatformSettings',
    after: { enabled, mode: 'approval_required' },
  });
}

/** Distributed, bounded hourly limits. Only salted identifiers are retained, with a TTL. */
async function consumeRate(scope: string, value: string, limit: number) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error('Trial registration is temporarily unavailable.');
  const window = Math.floor(Date.now() / 3_600_000);
  const key = createHmac('sha256', secret).update(`${scope}:${window}:${value}`).digest('hex');
  const update = {
    $inc: { count: 1 },
    $setOnInsert: { expiresAt: new Date((window + 2) * 3_600_000) },
  };
  let rate;
  try {
    rate = await RegistrationRateModel.findOneAndUpdate({ _id: key }, update, {
      upsert: true,
      returnDocument: 'after',
    });
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
    rate = await RegistrationRateModel.findOneAndUpdate(
      { _id: key },
      { $inc: { count: 1 } },
      { returnDocument: 'after' },
    );
  }
  if (!rate || rate.count > limit) throw new Error('Too many requests. Please try again later.');
}

async function mailTenant() {
  const settings = await PlatformSettingsModel.findOne({ key: 'platform' });
  if (
    !settings?.registrationEmailTenantId ||
    !publicConfigurationReady() ||
    !(await TenantModel.exists({
      _id: settings.registrationEmailTenantId,
      status: 'active',
      deletedAt: null,
    }))
  )
    throw new Error('Trial registration is temporarily unavailable.');
  return settings;
}

async function enqueue(to: string, subject: string, text: string, session: ClientSession) {
  const settings = await mailTenant();
  const queued = await runWithContext(
    {
      tenantId: settings.registrationEmailTenantId!,
      userId: new Types.ObjectId(),
      isPlatformAdmin: false,
    },
    () => queueEmail({ kind: 'trial_registration', to, subject, text }, session),
  );
  if (!queued)
    throw new Error('Registration email is unavailable. Please contact the platform owner.');
}

export async function applyForTrial(
  raw: { companyName: string; adminName: string; email: string; slug: string },
  ip: string,
) {
  await connectToDatabase();
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success)
    throw new Error(
      'Enter a company, your name, a valid email and a workspace identifier using lower-case letters, numbers and single hyphens.',
    );
  const input = parsed.data;
  if (reserved.has(input.slug)) throw new Error('Choose a different workspace identifier.');
  await consumeRate('apply-ip', ip.slice(0, 128) || 'unknown', 10);
  await consumeRate('apply-email', input.email, 3);
  if (!(await registrationAvailability()).available)
    throw new Error('Trial applications are temporarily closed. Please contact Worktello.');
  if (await UserModel.exists({ email: input.email, deletedAt: null })) return;
  if (await TenantModel.exists({ slug: input.slug }))
    throw new Error('That workspace identifier is unavailable. Choose another.');
  const token = newToken();
  const now = new Date();
  const database = await connectToDatabase();
  try {
    await database.connection.transaction(async (session) => {
      const previous = await TrialApplicationModel.findOne({ email: input.email }).session(session);
      if (
        previous &&
        (!['unverified', 'rejected'].includes(previous.status) ||
          previous.lastIssuedAt.getTime() > now.getTime() - 600_000)
      )
        return;
      const fields = {
        ...input,
        status: 'unverified' as const,
        verificationTokenHash: hash(token),
        verificationExpiresAt: new Date(now.getTime() + DAY_MS),
        lastIssuedAt: now,
        verifiedAt: null,
        reviewedAt: null,
        reviewNote: '',
        reviewedById: null,
        purgeAt: new Date(now.getTime() + 3 * DAY_MS),
      };
      if (previous)
        await TrialApplicationModel.updateOne({ _id: previous._id }, { $set: fields }, { session });
      else await TrialApplicationModel.create([fields], { session });
      await enqueue(
        input.email,
        'Verify your Worktello trial application',
        `Hello ${input.adminName},\n\nConfirm your email to submit ${input.companyName} for review:\n\n${appBaseUrl()}/register/verify?token=${token}\n\nThis link expires in 24 hours. Your workspace and trial will start only after approval. If you did not apply, ignore this email.`,
        session,
      );
    });
  } catch (error) {
    // Concurrent requests cannot create two applications or disclose an existing account.
    if ((error as { code?: number }).code !== 11000) throw error;
  }
}

export async function verifyTrialEmail(token: string) {
  await connectToDatabase();
  if (!validToken(token))
    throw new Error('This verification link is invalid or expired. Apply again for a new link.');
  const application = await TrialApplicationModel.findOneAndUpdate(
    {
      verificationTokenHash: hash(token),
      status: 'unverified',
      verificationExpiresAt: { $gt: new Date() },
    },
    { $set: { status: 'pending', verifiedAt: new Date(), purgeAt: null } },
    { returnDocument: 'after' },
  );
  if (!application)
    throw new Error(
      'This verification link is expired or already used. If you verified earlier, your application is awaiting review.',
    );
  // Email verification never provisions accounts, regardless of a future mode setting.
}

export async function listTrialApplications() {
  await requirePlatformAdministrator();
  const rows = await TrialApplicationModel.find({}).sort({ createdAt: -1 }).limit(100);
  return rows.map((row) => ({
    id: String(row._id),
    companyName: row.companyName,
    adminName: row.adminName,
    email: row.email,
    slug: row.slug,
    status: row.status,
    verified: Boolean(row.verifiedAt),
    createdAt: row.createdAt.toISOString(),
    reviewNote: row.reviewNote,
    activated: Boolean(row.activatedAt),
  }));
}

export async function reviewTrialApplication(
  id: string,
  decision: 'approve' | 'reject',
  note: string,
) {
  const actor = await requirePlatformAdministrator();
  if (!Types.ObjectId.isValid(id)) throw new Error('Application not found.');
  if (
    !['approve', 'reject'].includes(decision) ||
    note.length > 500 ||
    (decision === 'reject' && !note.trim())
  )
    throw new Error('Enter a rejection reason of at most 500 characters.');
  const defaults = await provisioningDefaults();
  const activationToken = newToken();
  const tenantId = new Types.ObjectId();
  const userId = new Types.ObjectId();
  const database = await connectToDatabase();
  await database.connection.transaction(async (session) => {
    const app = await TrialApplicationModel.findOne({
      _id: id,
      status: 'pending',
      verifiedAt: { $ne: null },
    }).session(session);
    if (!app)
      throw new Error(
        'Only a verified application awaiting approval can be reviewed. Refresh the list.',
      );
    const now = new Date();
    if (decision === 'approve') {
      if (await TenantModel.exists({ slug: app.slug }).session(session))
        throw new Error(
          'That workspace identifier is already in use. Reject the application and ask for another identifier.',
        );
      if (await UserModel.exists({ email: app.email, deletedAt: null }).session(session))
        throw new Error(
          'This email already has an account. Review its tenant membership before approval.',
        );
      await TenantModel.create(
        [
          {
            _id: tenantId,
            name: app.companyName,
            slug: app.slug,
            storageLimitBytes: defaults.storageLimitBytes,
            storageUsedBytes: 0,
            commercial: {
              status: 'trialing',
              startedAt: now,
              trialEndsAt: new Date(now.getTime() + defaults.trialDays * DAY_MS),
            },
          },
        ],
        { session },
      );
      await UserModel.create(
        [
          {
            _id: userId,
            tenantId,
            name: app.adminName,
            email: app.email,
            role: 'tenant_admin',
            status: 'invited',
            mustChangePassword: true,
          },
        ],
        { session },
      );
      await QueueModel.create(
        [{ tenantId, name: 'General support', isDefault: true, status: 'active' }],
        { session },
      );
      await enqueue(
        app.email,
        'Your Worktello trial is approved',
        `Hello ${app.adminName},\n\n${app.companyName} is approved. Your ${defaults.trialDays}-day trial starts today.\n\nChoose your administrator password using this one-time link (valid for 48 hours):\n\n${appBaseUrl()}/register/activate?token=${activationToken}\n\nThen sign in at ${appBaseUrl()}/login?view=staff. If this link expires, request a new activation email from the activation page.`,
        session,
      );
      await TrialApplicationModel.updateOne(
        { _id: app._id },
        {
          $set: {
            status: 'approved',
            tenantId,
            userId,
            activationTokenHash: hash(activationToken),
            activationExpiresAt: new Date(now.getTime() + 2 * DAY_MS),
            reviewedAt: now,
            reviewedById: actor._id,
            reviewNote: note.trim(),
          },
        },
        { session },
      );
      await AuditLogModel.create(
        [
          {
            tenantId,
            actorId: actor._id,
            action: 'tenant.created',
            entityType: 'Tenant',
            entityId: tenantId,
            after: {
              source: 'trial_application',
              applicationId: String(app._id),
              trialDays: defaults.trialDays,
              storageLimitBytes: defaults.storageLimitBytes,
            },
          },
        ],
        { session },
      );
    } else {
      await enqueue(
        app.email,
        'Update on your Worktello trial application',
        `Hello ${app.adminName},\n\nWe could not approve your application for ${app.companyName}.\n\n${note.trim()}\n\nYou can contact Worktello for help, or submit a revised application. No workspace was created.`,
        session,
      );
      await TrialApplicationModel.updateOne(
        { _id: app._id },
        {
          $set: {
            status: 'rejected',
            reviewedAt: now,
            reviewedById: actor._id,
            reviewNote: note.trim(),
          },
        },
        { session },
      );
    }
    await AuditLogModel.create(
      [
        {
          tenantId: actor.tenantId,
          actorId: actor._id,
          action: `trial_application.${decision === 'approve' ? 'approved' : 'rejected'}`,
          entityType: 'TrialApplication',
          entityId: app._id,
          after: {
            companyName: app.companyName,
            email: app.email,
            note: note.trim(),
            ...(decision === 'approve' ? { tenantId: String(tenantId) } : {}),
          },
        },
      ],
      { session },
    );
  });
}

export async function trialActivationValid(token: string) {
  await connectToDatabase();
  if (!validToken(token)) return false;
  const app = await TrialApplicationModel.findOne({
    status: 'approved',
    activatedAt: null,
    activationTokenHash: hash(token),
    activationExpiresAt: { $gt: new Date() },
  });
  return Boolean(
    app &&
    (await UserModel.exists({
      _id: app.userId,
      tenantId: app.tenantId,
      role: 'tenant_admin',
      status: 'invited',
      deletedAt: null,
    })) &&
    (await TenantModel.exists({ _id: app.tenantId, status: 'active', deletedAt: null })),
  );
}

export async function activateTrialAdministrator(token: string, password: string) {
  await connectToDatabase();
  if (!validToken(token)) throw new Error('This activation link is invalid or expired.');
  const app = await TrialApplicationModel.findOne({
    status: 'approved',
    activatedAt: null,
    activationTokenHash: hash(token),
    activationExpiresAt: { $gt: new Date() },
  });
  if (!app) throw new Error('This activation link is invalid, expired or already used.');
  if (!app.tenantId || !app.userId) throw new Error('Account unavailable.');
  const tenantId = app.tenantId;
  const userId = app.userId;
  const problem = passwordProblem(password, { name: app.adminName, email: app.email });
  if (problem) throw new Error(problem);
  const passwordHash = await hashPassword(password);
  const database = await connectToDatabase();
  await database.connection.transaction(async (session) => {
    if (
      !(await TenantModel.exists({ _id: tenantId, status: 'active', deletedAt: null }).session(
        session,
      ))
    )
      throw new Error('Workspace unavailable.');
    const claimed = await TrialApplicationModel.updateOne(
      {
        _id: app._id,
        activatedAt: null,
        activationTokenHash: hash(token),
        activationExpiresAt: { $gt: new Date() },
      },
      { $set: { activatedAt: new Date(), activationTokenHash: null } },
      { session },
    );
    if (claimed.modifiedCount !== 1)
      throw new Error('This activation link is expired or already used.');
    const changed = await UserModel.updateOne(
      {
        _id: userId,
        tenantId: tenantId,
        status: 'invited',
        role: 'tenant_admin',
        deletedAt: null,
      },
      { $set: { passwordHash, status: 'active', mustChangePassword: false } },
      { session },
    );
    if (changed.modifiedCount !== 1) throw new Error('Account unavailable.');
    await AuditLogModel.create(
      [
        {
          tenantId: tenantId,
          actorId: userId,
          action: 'trial_administrator.activated',
          entityType: 'User',
          entityId: userId,
        },
      ],
      { session },
    );
  });
}

export async function resendTrialActivation(email: string, ip: string) {
  await connectToDatabase();
  const normal = email.trim().toLowerCase();
  if (!z.email().safeParse(normal).success || normal.length > 254) return;
  await consumeRate('activation-ip', ip.slice(0, 128) || 'unknown', 10);
  await consumeRate('activation-email', normal, 3);
  const token = newToken();
  const database = await connectToDatabase();
  await database.connection.transaction(async (session) => {
    const app = await TrialApplicationModel.findOne({
      email: normal,
      status: 'approved',
      activatedAt: null,
    }).session(session);
    if (
      !app ||
      !(await UserModel.exists({
        _id: app.userId,
        tenantId: app.tenantId,
        status: 'invited',
        deletedAt: null,
      }).session(session))
    )
      return;
    await TrialApplicationModel.updateOne(
      { _id: app._id },
      {
        $set: {
          activationTokenHash: hash(token),
          activationExpiresAt: new Date(Date.now() + 2 * DAY_MS),
        },
      },
      { session },
    );
    await enqueue(
      app.email,
      'Activate your Worktello administrator account',
      `Choose your password using this one-time link, valid for 48 hours:\n\n${appBaseUrl()}/register/activate?token=${token}\n\nIf you did not request this, ignore the email.`,
      session,
    );
  });
}
