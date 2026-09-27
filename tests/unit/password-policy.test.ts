import { describe, expect, it } from 'vitest';
import { passwordProblem, passwordStrength } from '@/modules/core/password-policy';

const about = { email: 'fatima.noor@digisol.ae', name: 'Fatima Noor' };

describe('password rules (NIST SP 800-63B)', () => {
  it('accepts a long passphrase without demanding symbols or capitals', () => {
    expect(passwordProblem('amber kettle mountain ladder', about)).toBeNull();
    expect(passwordProblem('ribbon-orchard-7-velvet', about)).toBeNull();
  });

  it('refuses anything under twelve characters', () => {
    expect(passwordProblem('Xy7#kd92!', about)).toMatch(/12 characters/);
  });

  it('refuses common passwords even with the usual padding and swaps', () => {
    for (const password of [
      'Password123!',
      'P@ssw0rd2026',
      'Qwertyuiop12',
      'Digisol@2026!',
      'Password123!Password123!',
    ]) {
      expect(passwordProblem(password, about)).toMatch(/common/i);
    }
  });

  it('refuses simple patterns and the person’s own name or email', () => {
    expect(passwordProblem('aaaaaaaaaaaaaa', about)).toMatch(/pattern/i);
    expect(passwordProblem('123456789012', about)).toMatch(/pattern/i);
    expect(passwordProblem('fatima-summer-garden', about)).toMatch(/own name/i);
  });

  it('rates length above variety', () => {
    expect(passwordStrength('Ab1!')).toBeLessThan(passwordStrength('amber kettle mountain ladder'));
    expect(passwordStrength('amber kettle mountain ladder')).toBe(4);
  });
});
