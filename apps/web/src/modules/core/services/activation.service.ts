import { createHash, createHmac, randomInt, randomBytes } from 'node:crypto';
import { connectToDatabase } from '@/lib/db';
import { hashPassword } from '@/lib/password';
import { runWithContext } from '@/lib/tenant-context';
import { UserModel } from '@coex/shared/core/models/user.model';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { ActivationModel } from '@coex/shared/core/models/activation.model';
import { passwordProblem } from '@coex/shared/core/password-policy';
import { queueEmail } from './email.service';

const tokenHash = (value: string) => createHash('sha256').update(value).digest('hex');
function codeHash(userId: string, code: string) {
  if (!process.env.AUTH_SECRET) throw new Error('Account activation is unavailable.');
  return createHmac('sha256', process.env.AUTH_SECRET).update(`${userId}:${code}`).digest('hex');
}
async function eligible(email: string) {
  const matches = await UserModel.find({
    email: email.trim().toLowerCase(),
    deletedAt: null,
  }).limit(2);
  const user = matches.length === 1 ? matches[0] : null;
  if (
    !user ||
    user.role !== 'client_contact' ||
    user.status !== 'invited' ||
    !user.mustChangePassword
  )
    return null;
  if (!(await TenantModel.exists({ _id: user.tenantId, status: 'active' }))) return null;
  return user;
}
export async function requestActivation(email: string) {
  await connectToDatabase();
  const user = await eligible(email);
  if (!user) return;
  const now = new Date();
  const code = String(randomInt(100000, 1000000));
  const challenge = {
    codeHash: codeHash(String(user._id), code),
    attempts: 0,
    sentAt: now,
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
    tokenHash: null,
    verifiedAt: null,
    usedAt: null,
  };
  // One challenge per account, at most one issue per ten minutes. Atomic update bounds concurrent sends.
  const existing = await ActivationModel.findOneAndUpdate(
    { userId: user._id, sentAt: { $lte: new Date(now.getTime() - 10 * 60 * 1000) } },
    { $set: challenge },
    { returnDocument: 'after' },
  );
  if (!existing) {
    try {
      await ActivationModel.create({ userId: user._id, tenantId: user.tenantId, ...challenge });
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
        subject: 'Your Worktello activation code',
        text: `Your Worktello activation code is ${code}. It expires in 10 minutes. After verification, choose your password. If you did not request this, ignore this email.`,
      }),
  );
  if (!queued) await ActivationModel.deleteOne({ userId: user._id, codeHash: challenge.codeHash });
}
export async function verifyActivation(email: string, code: string) {
  await connectToDatabase();
  if (!/^\d{6}$/.test(code)) throw new Error('Enter the six-digit code from your email.');
  const user = await eligible(email);
  if (!user) throw new Error('Code is invalid or expired.');
  const challenge = await ActivationModel.findOneAndUpdate(
    {
      userId: user._id,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: 5 },
      verifiedAt: null,
      usedAt: null,
    },
    { $inc: { attempts: 1 } },
    { returnDocument: 'after' },
  );
  if (!challenge || challenge.codeHash !== codeHash(String(user._id), code))
    throw new Error('Code is invalid or expired.');
  const token = randomBytes(32).toString('base64url');
  const claimed = await ActivationModel.updateOne(
    { _id: challenge._id, verifiedAt: null, codeHash: challenge.codeHash, usedAt: null },
    { $set: { verifiedAt: new Date(), tokenHash: tokenHash(token) } },
  );
  if (claimed.modifiedCount !== 1) throw new Error('Code was already used.');
  return token;
}
export async function finishActivation(token: string, password: string) {
  await connectToDatabase();
  const challenge = await ActivationModel.findOne({
    tokenHash: tokenHash(token),
    verifiedAt: { $ne: null },
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!challenge) throw new Error('Activation expired. Request a new code.');
  const user = await UserModel.findOne({
    _id: challenge.userId,
    tenantId: challenge.tenantId,
    role: 'client_contact',
    status: 'invited',
    mustChangePassword: true,
    deletedAt: null,
  });
  if (!user || !(await TenantModel.exists({ _id: user.tenantId, status: 'active' })))
    throw new Error('Account is unavailable.');
  const problem = passwordProblem(password, { email: user.email, name: user.name });
  if (problem) throw new Error(problem);
  const passwordHash = await hashPassword(password);
  const claimed = await ActivationModel.updateOne(
    { _id: challenge._id, usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
  );
  if (claimed.modifiedCount !== 1) throw new Error('Activation was already used.');
  const updated = await UserModel.updateOne(
    { _id: user._id, status: 'invited', mustChangePassword: true, deletedAt: null },
    { $set: { passwordHash, status: 'active', mustChangePassword: false } },
  );
  if (updated.modifiedCount !== 1) throw new Error('Account changed. Contact support.');
}
