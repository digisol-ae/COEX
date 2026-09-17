import { createHash, randomBytes } from 'node:crypto';
import type { Types } from 'mongoose';
import { SessionModel } from '../models/session.model';

/**
 * Session lifecycle.
 *
 * The cookie carries a random token. Only its SHA-256 hash is stored, so a copy of the database
 * does not hand anyone a working session, in the same way a password file should not.
 *
 * Sessions are rows rather than signed tokens because an administrator must be able to end one,
 * and because a signed token cannot be withdrawn before it expires.
 */

export const SESSION_COOKIE = 'coex_session';
const SESSION_DAYS = 30;

export interface NewSession {
  token: string;
  expiresAt: Date;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(input: {
  userId: Types.ObjectId;
  tenantId: Types.ObjectId;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<NewSession> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await SessionModel.create({
    token: hashToken(token),
    userId: input.userId,
    tenantId: input.tenantId,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    createdAt: new Date(),
    lastSeenAt: new Date(),
    expiresAt,
  });

  return { token, expiresAt };
}

export async function resolveSession(token: string) {
  const session = await SessionModel.findOne({
    token: hashToken(token),
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!session) return null;

  // Touched rather than written on every request: a minute of drift is not worth the write cost.
  if (Date.now() - session.lastSeenAt.getTime() > 60_000) {
    await SessionModel.updateOne({ _id: session._id }, { $set: { lastSeenAt: new Date() } });
  }

  return session;
}

export async function revokeSession(token: string): Promise<void> {
  await SessionModel.updateOne({ token: hashToken(token) }, { $set: { revokedAt: new Date() } });
}

/** Used when an account is suspended or its password changes. */
export async function revokeAllSessionsForUser(userId: Types.ObjectId): Promise<void> {
  await SessionModel.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}
