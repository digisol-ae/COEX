import { connectToDatabase } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { UserModel } from '../models/user.model';
import { TenantModel } from '../models/tenant.model';
import { createSession, revokeSession } from './session.service';
import { recordUnauthenticatedAudit } from './audit.service';

/**
 * Password sign in.
 *
 * Microsoft Entra is the primary route for DigiSol staff and lands here later as a second entry
 * point that creates the same session record. Everything after the identity check is shared, so
 * adding Entra does not change how the rest of the application sees a signed in user.
 */

export interface SignInResult {
  ok: boolean;
  token?: string;
  expiresAt?: Date;
  error?: string;
}

/** Deliberately vague. Telling an attacker which half was wrong helps only the attacker. */
const GENERIC_FAILURE = 'Email or password is incorrect.';

export async function signInWithPassword(input: {
  email: string;
  password: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<SignInResult> {
  await connectToDatabase();

  const email = input.email.trim().toLowerCase();

  const user = await UserModel.findOne({ email, deletedAt: null }).select('+passwordHash');

  if (!user || !user.passwordHash) {
    return { ok: false, error: GENERIC_FAILURE };
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    await recordUnauthenticatedAudit(user.tenantId, {
      action: 'auth.sign_in_failed',
      entityType: 'User',
      entityId: user._id,
      actorEmail: email,
      ipAddress: input.ipAddress,
    });

    return { ok: false, error: GENERIC_FAILURE };
  }

  if (user.status !== 'active') {
    return { ok: false, error: 'This account is not active. Ask an administrator to enable it.' };
  }

  const tenant = await TenantModel.findOne({ _id: user.tenantId, status: 'active' });

  if (!tenant) {
    return { ok: false, error: 'This account belongs to a suspended tenant.' };
  }

  const session = await createSession({
    userId: user._id,
    tenantId: user.tenantId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  await UserModel.updateOne({ _id: user._id }, { $set: { lastSignedInAt: new Date() } });

  await recordUnauthenticatedAudit(user.tenantId, {
    action: 'auth.sign_in',
    entityType: 'User',
    entityId: user._id,
    actorEmail: email,
    ipAddress: input.ipAddress,
  });

  return { ok: true, token: session.token, expiresAt: session.expiresAt };
}

/** Microsoft verifies the identity first. COEX then permits only an existing active account;
 * SSO is never an account-provisioning back door. */
export async function signInWithEntra(input: {
  email: string;
  entraObjectId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<SignInResult> {
  await connectToDatabase();
  const email = input.email.trim().toLowerCase();
  let user = await UserModel.findOne({ entraObjectId: input.entraObjectId, deletedAt: null });
  if (!user) {
    const matches = await UserModel.find({ email, deletedAt: null }).limit(2);
    if (matches.length !== 1)
      return {
        ok: false,
        error:
          'Your Microsoft account is not a registered COEX account. Ask an administrator for access.',
      };
    user = matches[0];
    if (user.entraObjectId && user.entraObjectId !== input.entraObjectId)
      return { ok: false, error: 'This COEX account is linked to another Microsoft identity.' };
    await UserModel.updateOne({ _id: user._id }, { $set: { entraObjectId: input.entraObjectId } });
  }
  if (user.status !== 'active')
    return { ok: false, error: 'This account is not active. Ask an administrator to enable it.' };
  const tenant = await TenantModel.findOne({ _id: user.tenantId, status: 'active' });
  if (!tenant) return { ok: false, error: 'This account belongs to a suspended tenant.' };
  const session = await createSession({
    userId: user._id,
    tenantId: user.tenantId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });
  await UserModel.updateOne({ _id: user._id }, { $set: { lastSignedInAt: new Date() } });
  await recordUnauthenticatedAudit(user.tenantId, {
    action: 'auth.entra_sign_in',
    entityType: 'User',
    entityId: user._id,
    actorEmail: email,
    ipAddress: input.ipAddress,
  });
  return { ok: true, token: session.token, expiresAt: session.expiresAt };
}

export async function signOut(token: string): Promise<void> {
  await connectToDatabase();
  await revokeSession(token);
}
