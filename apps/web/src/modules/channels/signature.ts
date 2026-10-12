import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Every call between XVERSE and COEX is signed, in both directions and in both connector cases.
 *
 *   X-COEX-Timestamp: unix seconds
 *   X-COEX-Signature: sha256=<hex HMAC-SHA256 of "<timestamp>.<raw body>" with the tenant secret>
 *
 * The timestamp is inside the signature and must be within five minutes, so a captured request
 * cannot be replayed later. A GET (the outbox in Case B) signs an empty body.
 */

export const SIGNATURE_HEADER = 'x-coex-signature';
export const TIMESTAMP_HEADER = 'x-coex-timestamp';
export const MAX_SKEW_SECONDS = 300;

export function signPayload(secret: string, timestamp: string, body: string): string {
  return `sha256=${createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')}`;
}

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export function verifySignature({
  secret,
  timestamp,
  signature,
  body,
  now = Date.now(),
}: {
  secret: string;
  timestamp: string | null;
  signature: string | null;
  body: string;
  now?: number;
}): VerifyResult {
  if (!timestamp || !signature) return { ok: false, reason: 'Missing signature headers.' };
  if (!/^\d{9,11}$/.test(timestamp)) return { ok: false, reason: 'Invalid timestamp.' };
  if (Math.abs(now / 1000 - Number(timestamp)) > MAX_SKEW_SECONDS) {
    return { ok: false, reason: 'Timestamp is outside the allowed window.' };
  }
  const expected = Buffer.from(signPayload(secret, timestamp, body));
  const given = Buffer.from(signature.startsWith('sha256=') ? signature : `sha256=${signature}`);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: 'Signature does not match.' };
  }
  return { ok: true };
}

/** A new tenant signing secret, shown once in Setup and stored sealed. */
export function newSigningSecret(): string {
  return `whsec_${randomBytes(32).toString('base64url')}`;
}
