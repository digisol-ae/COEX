import { describe, expect, it } from 'vitest';
import { normaliseCc, quickCustomerSchema } from '@/modules/tickets/collaborators';

describe('ticket collaborators', () => {
  it('deduplicates addresses regardless of case and excludes the primary recipient', () => {
    expect(
      normaliseCc(
        [' A@example.com ', 'a@example.com', 'CUSTOMER@example.com'],
        'customer@example.com',
      ),
    ).toEqual(['a@example.com']);
  });
  it('refuses malformed addresses and injected email headers', () => {
    expect(() => normaliseCc(['invalid'])).toThrow('Invalid CC');
    expect(() => normaliseCc(['a@example.com\r\nBcc: hidden@example.com'])).toThrow('Invalid CC');
  });
  it('requires both a customer name and valid email', () => {
    expect(quickCustomerSchema.safeParse({ name: ' ', email: 'a@example.com' }).success).toBe(
      false,
    );
    expect(quickCustomerSchema.safeParse({ name: 'Customer', email: 'invalid' }).success).toBe(
      false,
    );
    expect(quickCustomerSchema.parse({ name: ' Customer ', email: 'A@example.com' })).toEqual({
      name: 'Customer',
      email: 'a@example.com',
    });
  });
});
