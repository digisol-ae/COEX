/**
 * Password rules, following NIST SP 800-63B and the OWASP guidance built on it (John asked for
 * "world standard", 27 Sep 2026).
 *
 * Length is what makes a password hard to guess, so it is the main rule: at least 12 characters,
 * and passphrases up to 128 are welcome. There is deliberately no "one capital, one digit, one
 * symbol" rule: NIST dropped it because it pushes people to Password1! and its cousins. Instead,
 * known common passwords, obvious sequences, and anything built from the person's own name, email
 * or the company's name are refused.
 *
 * Pure, so the page can show the same verdict as the server while someone types.
 */

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

/** A short list of the most used passwords and their usual padding; enough to catch the obvious. */
const COMMON = [
  'password',
  'passw0rd',
  'p@ssword',
  'p@ssw0rd',
  'qwerty',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
  'letmein',
  'welcome',
  'iloveyou',
  'admin',
  'administrator',
  'changeme',
  'monkey',
  'dragon',
  'football',
  'baseball',
  'sunshine',
  'princess',
  'master',
  'shadow',
  'superman',
  'trustno1',
  'abc123',
  'secret',
  'default',
  'login',
  'pakistan',
  'karachi',
  'lahore',
  'dubai',
  'emirates',
  'digisol',
  'coex',
];

function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[^a-z]/g, '');
}

function isSequence(value: string): boolean {
  const run = value.toLowerCase();
  // Each row twice over, so a run that wraps round, like 1234567890123, is still caught.
  const rows = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiopasdfghjklzxcvbnm'].map(
    (row) => row.repeat(3),
  );
  return rows.some((row) => row.includes(run) || row.split('').reverse().join('').includes(run));
}

/** Why a password would be refused, in words a person can act on; null when it is acceptable. */
export function passwordProblem(
  password: string,
  about: { email?: string | null; name?: string | null } = {},
): string | null {
  if (password.length < PASSWORD_MIN) {
    return `Use at least ${PASSWORD_MIN} characters. A few unrelated words make it long and easy to remember.`;
  }
  if (password.length > PASSWORD_MAX) return `Keep it under ${PASSWORD_MAX} characters.`;
  if (/^(.)\1+$/.test(password) || isSequence(password)) {
    return 'That is a simple pattern. Choose something less predictable.';
  }

  const letters = normalise(password);
  // A common word with padding round it is still that word: once every copy of it is taken out,
  // what is left must bring real variety, not just the 1s and !s that Password123! adds.
  const paddingOnly = (word: string) =>
    letters.includes(word) && new Set(letters.replaceAll(word, '')).size <= 4;
  if (COMMON.some(paddingOnly)) {
    return 'That password is too common, or built around a common word. Choose something less predictable.';
  }

  const own = [
    ...(about.email ?? '')
      .toLowerCase()
      .split('@')[0]
      .split(/[^a-z]+/),
    ...(about.name ?? '').toLowerCase().split(/\s+/),
  ].filter((part) => part.length >= 3);
  if (own.some((part) => letters.includes(normalise(part)))) {
    return 'Leave your own name or email out of your password.';
  }

  return null;
}

/** 0 to 4, for the meter while typing: length first, with a little credit for variety. */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((kind) =>
    kind.test(password),
  ).length;
  const score = Math.floor(password.length / 6) + (variety >= 3 ? 1 : 0);
  if (password.length < PASSWORD_MIN) return Math.min(score, 1) as 0 | 1;
  return Math.max(2, Math.min(4, score)) as 2 | 3 | 4;
}
