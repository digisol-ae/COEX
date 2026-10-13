import { hash, verify } from '@node-rs/argon2';

/**
 * Password hashing with Argon2id, the algorithm recommended for new systems.
 *
 * The parameters below are the OWASP baseline: 19 MiB of memory, two passes, one thread. They cost
 * roughly 50 milliseconds per hash on a modern machine, which is slow enough to make offline
 * cracking expensive and fast enough that nobody notices at sign in.
 */

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTIONS);
}

export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  try {
    return await verify(passwordHash, plain, ARGON2_OPTIONS);
  } catch {
    // A malformed hash must read as a failed sign in, never as an exception the caller has to
    // remember to catch.
    return false;
  }
}
