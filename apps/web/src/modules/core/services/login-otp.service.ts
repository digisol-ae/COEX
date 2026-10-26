import { createHmac, randomInt } from 'node:crypto';
import { connectToDatabase } from '@/lib/db';
import { runWithContext } from '@/lib/tenant-context';
import { UserModel } from '@coex/shared/core/models/user.model';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { LoginOtpModel } from '@coex/shared/core/models/login-otp.model';
import { queueEmail } from './email.service';
import { createSession } from './session.service';
import { recordUnauthenticatedAudit } from './audit.service';

function codeHash(userId: string, code: string) {
  if (!process.env.AUTH_SECRET) throw new Error('Email sign-in is unavailable.');
  return createHmac('sha256', process.env.AUTH_SECRET)
    .update(`login:${userId}:${code}`)
    .digest('hex');
}
async function eligible(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return null;
  const found = await UserModel.find({ email: email.trim().toLowerCase(), deletedAt: null }).limit(
    2,
  );
  const user = found.length === 1 ? found[0] : null;
  if (
    !user ||
    user.role !== 'client_contact' ||
    (user.status !== 'active' &&
      !(
        user.status === 'invited' &&
        user.mustChangePassword &&
        user.legacySourceId?.startsWith('osticket:')
      ))
  )
    return null;
  if (!(await TenantModel.exists({ _id: user.tenantId, status: 'active' }))) return null;
  return user;
}
export async function requestLoginOtp(email: string): Promise<void> {
  await connectToDatabase();
  await LoginOtpModel.init();
  const user = await eligible(email.trim().toLowerCase());
  if (!user) return;
  const now = new Date();
  const code = String(randomInt(100000, 1000000));
  const challenge = {
    codeHash: codeHash(String(user._id), code),
    attempts: 0,
    sentAt: now,
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
    usedAt: null,
  };
  const existing = await LoginOtpModel.findOneAndUpdate(
    { userId: user._id, sentAt: { $lte: new Date(now.getTime() - 10 * 60 * 1000) } },
    { $set: challenge },
    { returnDocument: 'after' },
  );
  if (!existing) {
    try {
      await LoginOtpModel.create({ userId: user._id, tenantId: user.tenantId, ...challenge });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return;
      throw error;
    }
  }
  const queued = await runWithContext(
    { tenantId: user.tenantId, userId: user._id, isPlatformAdmin: false },
    () =>
      queueEmail({
        kind: 'password_reset',
        to: user.email,
        subject: 'Your Worktello sign-in code',
        text: `Your Worktello sign-in code is ${code}. It works once and expires in 10 minutes. If you did not request this, ignore this email.`,
      }),
  );
  if (!queued) await LoginOtpModel.deleteOne({ userId: user._id, codeHash: challenge.codeHash });
}
export async function signInWithEmailOtp(input: {
  email: string;
  code: string;
  rememberMe?: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await connectToDatabase();
  if (!/^\d{6}$/.test(input.code)) throw new Error('Code is invalid or expired.');
  const user = await eligible(input.email.trim().toLowerCase());
  if (!user) throw new Error('Code is invalid or expired.');
  const challenge = await LoginOtpModel.findOneAndUpdate(
    { userId: user._id, usedAt: null, attempts: { $lt: 5 }, expiresAt: { $gt: new Date() } },
    { $inc: { attempts: 1 } },
    { returnDocument: 'after' },
  ).select('+codeHash');
  if (!challenge || challenge.codeHash !== codeHash(String(user._id), input.code))
    throw new Error('Code is invalid or expired.');
  const claimed = await LoginOtpModel.updateOne(
    {
      _id: challenge._id,
      usedAt: null,
      codeHash: challenge.codeHash,
      expiresAt: { $gt: new Date() },
    },
    { $set: { usedAt: new Date() } },
  );
  if (claimed.modifiedCount !== 1) throw new Error('Code is invalid or expired.');
  // Recheck status after claiming: a concurrent suspension must not be reactivated.
  const available = await UserModel.findOneAndUpdate(
    { _id: user._id, status: user.status, updatedAt: user.updatedAt, deletedAt: null },
    { $set: { status: 'active', mustChangePassword: false, lastSignedInAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!available || !(await TenantModel.exists({ _id: user.tenantId, status: 'active' })))
    throw new Error('Account is unavailable.');
  const session = await createSession({
    userId: user._id,
    tenantId: user.tenantId,
    rememberMe: input.rememberMe,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
  await recordUnauthenticatedAudit(user.tenantId, {
    action: 'auth.email_otp_sign_in',
    entityType: 'User',
    entityId: user._id,
    actorEmail: user.email,
    ipAddress: input.ipAddress,
  });
  return session;
}
