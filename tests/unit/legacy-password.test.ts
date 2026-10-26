import { describe, it, expect } from 'vitest';
import { hash } from 'bcryptjs';
import {
  hashPassword,
  isLegacyPasswordHash,
  verifyLegacyPassword,
  verifyPassword,
} from '@/lib/password';
describe('osTicket password compatibility', () => {
  it('verifies PHP bcrypt without exposing or changing the password', async () => {
    const value = (await hash('Remember My old Password!', 4)).replace('$2b$', '$2y$');
    expect(isLegacyPasswordHash(value)).toBe(true);
    expect(await verifyLegacyPassword('Remember My old Password!', value)).toBe(true);
    expect(await verifyLegacyPassword('wrong', value)).toBe(false);
    expect(await verifyPassword('Remember My old Password!', value)).toBe(false);
  });
  it('does not accept arbitrary, malformed or unbounded expensive hashes', async () => {
    expect(isLegacyPasswordHash('$2y$31$' + 'A'.repeat(53))).toBe(false);
    expect(await verifyLegacyPassword('password', 'not-a-hash')).toBe(false);
    expect(await verifyLegacyPassword('x'.repeat(129), await hash('x', 4))).toBe(false);
  });
  it('keeps new passwords on Argon2 and never uses bcrypt as a general fallback', async () => {
    const value = await hashPassword('A new strong password!');
    expect(value.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword('A new strong password!', value)).toBe(true);
    expect(await verifyLegacyPassword('A new strong password!', value)).toBe(false);
  });
});
