import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Encryption for the few secrets COEX keeps in its own database: mailbox and SMTP passwords.
 *
 * A database backup or an export must never hand anyone a working mail password, so the value is
 * sealed with AES-256-GCM. The key comes from COEX_ENCRYPTION_KEY, or from AUTH_SECRET when that is
 * not set. Changing whichever one is used means re-entering the passwords in Setup, Email.
 */

function key(): Buffer {
  const material = process.env.COEX_ENCRYPTION_KEY ?? process.env.AUTH_SECRET;
  if (!material) {
    throw new Error('Set COEX_ENCRYPTION_KEY (or AUTH_SECRET) before storing mail passwords.');
  }
  return createHash('sha256').update(`coex-secret-box:${material}`).digest();
}

export function sealSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    body.toString('base64'),
  ].join(':');
}

export function openSecret(sealed: string | null | undefined): string | null {
  if (!sealed) return null;
  const [version, iv, tag, body] = sealed.split(':');
  if (version !== 'v1' || !iv || !tag || !body) throw new Error('A stored password is unreadable.');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  try {
    return Buffer.concat([decipher.update(Buffer.from(body, 'base64')), decipher.final()]).toString(
      'utf8',
    );
  } catch {
    throw new Error('A stored mail password cannot be decrypted. Re-enter it in Setup, Email.');
  }
}
