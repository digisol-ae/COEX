import { describe, it, expect } from 'vitest';
import { ticketSearchTerms, literalPattern, phonePattern } from '@/modules/tickets/search-terms';
describe('ticket keyword and phone matching', () => {
  it('keeps quoted phrases and requires separate words', () =>
    expect(ticketSearchTerms('  Marina "printer offline" invoice Marina ')).toEqual([
      'Marina',
      'printer offline',
      'invoice',
    ]));
  it('treats formatted phone numbers as one term', () =>
    expect(ticketSearchTerms('+971 (50) 123-4567')).toEqual(['+971 (50) 123-4567']));
  it('matches international, local and formatted phone values', () => {
    expect(phonePattern('0501234567')!.test('+971 (50) 123-4567')).toBe(true);
    expect(phonePattern('+971 50 1234567')!.test('00971-50-123-4567')).toBe(true);
    expect(phonePattern('4567')!.test('+971 50 123 4567')).toBe(true);
    expect(phonePattern('0501234567')!.test('+971501999999')).toBe(false);
  });
  it('does not turn arbitrary terms or short digits into phone patterns', () => {
    expect(phonePattern('invoice 1234')).toBeNull();
    expect(phonePattern('12')).toBeNull();
  });
  it('escapes regular-expression metacharacters', () => {
    expect(literalPattern('a+b@example.test').test('a+b@example.test')).toBe(true);
    expect(literalPattern('.*').test('ordinary text')).toBe(false);
  });
  it('bounds input and handles blank text', () => {
    expect(ticketSearchTerms('  ')).toEqual([]);
    expect(ticketSearchTerms('a'.repeat(500))[0]).toHaveLength(120);
  });
});
