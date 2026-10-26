import { createHash, randomBytes } from 'node:crypto';
import type { Types } from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { runWithContext } from '@/lib/tenant-context';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { LoginOtpModel } from '@coex/shared/core/models/login-otp.model';
import { ActivationModel } from '@coex/shared/core/models/activation.model';
import { UserModel } from '@coex/shared/core/models/user.model';
import { PasswordResetModel } from '@coex/shared/core/models/password-reset.model';
import { passwordProblem } from '@coex/shared/core/password-policy';
import { recordAudit } from './audit.service';
import { appBaseUrl, queueEmail } from './email.service';
import { revokeAllSessionsForUser } from './session.service';

/**
 * Changing a password through a link sent to the registered email (John, 27 Sep 2026).
 *
 * The same route serves "change my password" from the profile and "forgot password" from the
 * sign-in page: proving you can read the account's mailbox is what authorises the change. Links
 * last thirty minutes, work once, and at most three are sent per account per hour.
 */

const LINK_MINUTES = 30;
const PER_HOUR = 3;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function newLink(): { token: string; link: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, link: `${appBaseUrl()}/reset-password?token=${token}` };
}

async function storeLink(
  user: { _id: Types.ObjectId; tenantId: Types.ObjectId },
  token: string,
  minutes: number,
): Promise<void> {
  await PasswordResetModel.create({
    tenantId: user.tenantId,
    userId: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + minutes * 60 * 1000),
  });
}

/** An administrator's reset link lasts a day: the person may not read their email for hours. */
const ADMIN_LINK_HOURS = 24;

/**
 * After an administrator resets someone's password and ticks "notify" (John, 28 Sep 2026): an email
 * from the Admin sender saying so, with a link to choose their own password instead of the
 * temporary one. The temporary password itself is never emailed.
 */
export async function notifyPasswordSetByAdmin(
  user: { _id: Types.ObjectId; tenantId: Types.ObjectId; name: string; email: string },
  adminName: string,
): Promise<boolean> {
  const { token, link } = newLink();
  const queued = await queueEmail({
    kind: 'password_set_by_admin',
    to: user.email,
    subject: 'Your Worktello password was reset',
    text: [
      `Hello ${user.name},`,
      '',
      `${adminName} has reset the password for your Worktello account. They will give you the temporary`,
      'password. You can also choose your own now with this link, which works once, for 24 hours:',
      '',
      link,
      '',
      'If you did not expect this, tell your administrator.',
      '',
      'This is an automatic message from Worktello.',
    ].join('\n'),
  });
  if (queued) await storeLink(user, token, ADMIN_LINK_HOURS * 60);
  return queued;
}

export type ResetRequestResult = 'sent' | 'email_off' | 'too_many' | 'no_account';

/**
 * Sends a reset link to the account with this email. The sign-in page shows the same answer
 * whatever this returns, so it never tells a stranger which addresses have accounts.
 */
export async function requestPasswordReset(email: string): Promise<ResetRequestResult> {
  await connectToDatabase();
  const matches = await UserModel.find({
    email: email.trim().toLowerCase(),
    deletedAt: null,
  }).limit(2);
  const user = matches.length === 1 ? matches[0] : null;
  if (
    !user ||
    (user.status !== 'active' &&
      !(
        user.role === 'client_contact' &&
        user.status === 'invited' &&
        user.mustChangePassword &&
        user.legacySourceId?.startsWith('osticket:')
      ))
  )
    return 'no_account';
  if (!(await TenantModel.exists({ _id: user.tenantId, status: 'active' }))) return 'no_account';

  const context = { tenantId: user.tenantId, userId: user._id, isPlatformAdmin: false };
  return runWithContext(context, async () => {
    const recent = await PasswordResetModel.countDocuments({
      userId: user._id,
      createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) },
    });
    if (recent >= PER_HOUR) return 'too_many';

    const { token, link } = newLink();

    const queued = await queueEmail({
      kind: 'password_reset',
      to: user.email,
      subject: 'Change your Worktello password',
      text: [
        `Hello ${user.name},`,
        '',
        'Someone asked to change the password for your Worktello account. If it was you, open this link',
        `within ${LINK_MINUTES} minutes to choose a new one:`,
        '',
        link,
        '',
        'If it was not you, ignore this email: your password stays as it is.',
        '',
        'This is an automatic message from Worktello.',
      ].join('\n'),
    });
    if (!queued) return 'email_off';

    await storeLink(user, token, LINK_MINUTES);
    await recordAudit({
      action: 'user.password_reset_requested',
      entityType: 'User',
      entityId: user._id,
    });
    return 'sent';
  });
}

/** Whether a link can still be used, so the page can say so before anyone types a password. */
export async function resetLinkIsValid(token: string): Promise<boolean> {
  await connectToDatabase();
  const found = await PasswordResetModel.findOne({
    tokenHash: hashToken(token),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
  return Boolean(found);
}

/**
 * Sets the new password from a link. Every session is signed out, because whoever else might have
 * had the old password should not keep a way in.
 */
export async function resetPasswordWithToken(token: string, password: string): Promise<void> {
  await connectToDatabase();
  const reset = await PasswordResetModel.findOne({
    tokenHash: hashToken(token),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!reset) throw new Error('This link has expired or was already used. Ask for a new one.');

  const user = await UserModel.findOne({
    _id: reset.userId,
    tenantId: reset.tenantId,
    deletedAt: null,
  });
  if (
    !user ||
    (user.status !== 'active' &&
      !(
        user.role === 'client_contact' &&
        user.status === 'invited' &&
        user.mustChangePassword &&
        user.legacySourceId?.startsWith('osticket:')
      ))
  )
    throw new Error('This account is not active.');
  if (!(await TenantModel.exists({ _id: user.tenantId, status: 'active' })))
    throw new Error('This account is not active.');

  const problem = passwordProblem(password, { email: user.email, name: user.name });
  if (problem) throw new Error(problem);

  // Claim the link first, so two tabs racing with the same link cannot both use it.
  const claimed = await PasswordResetModel.updateOne(
    { _id: reset._id, usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
  );
  if (claimed.modifiedCount !== 1) throw new Error('This link was already used.');

  const changed = await UserModel.updateOne(
    { _id: user._id, status: user.status, updatedAt: user.updatedAt, deletedAt: null },
    {
      $set: {
        passwordHash: await hashPassword(password),
        mustChangePassword: false,
        status: 'active',
      },
    },
  );
  if (changed.modifiedCount !== 1) throw new Error('Account changed. Ask for a new reset link.');
  await Promise.all([
    LoginOtpModel.updateMany({ userId: user._id, usedAt: null }, { $set: { usedAt: new Date() } }),
    ActivationModel.updateMany(
      { userId: user._id, usedAt: null },
      { $set: { usedAt: new Date() } },
    ),
    PasswordResetModel.updateMany(
      { userId: user._id, usedAt: null },
      { $set: { usedAt: new Date() } },
    ),
  ]);
  await revokeAllSessionsForUser(user._id);

  await runWithContext({ tenantId: user.tenantId, userId: user._id, isPlatformAdmin: false }, () =>
    recordAudit({ action: 'user.password_changed', entityType: 'User', entityId: user._id }),
  );
}
