import { describe, expect, it } from 'vitest';
import { normaliseMobile, splitMobile } from '@/modules/crm/phone';
import { fromMinorUnits, toMinorUnits } from '@/modules/crm/services/product.service';

/** Pure functions, no database. These run on every push. */

describe('mobile normalisation', () => {
  it('converts the local UAE form to E.164, which is what XVERSE matches on', () => {
    expect(normaliseMobile('050 123 4567')).toBe('+971501234567');
    expect(normaliseMobile('0501234567')).toBe('+971501234567');
    expect(normaliseMobile('+971 50 123 4567')).toBe('+971501234567');
    expect(normaliseMobile('971501234567')).toBe('+971501234567');
  });

  it('uses the given country for numbers outside the United Arab Emirates', () => {
    expect(normaliseMobile('0300 1234567', 'PK')).toBe('+923001234567');
  });

  it('handles the 00 international prefix used across the Gulf', () => {
    expect(normaliseMobile('00971501234567')).toBe('+971501234567');
  });

  it('returns nothing for empty input rather than inventing a number', () => {
    expect(normaliseMobile('')).toBeNull();
    expect(normaliseMobile(null)).toBeNull();
  });

  it('splits a stored number back into country and local part for editing', () => {
    expect(splitMobile('+971501234567')).toEqual({ country: 'AE', local: '501234567' });
    expect(splitMobile('+923001234567')).toEqual({ country: 'PK', local: '3001234567' });
    expect(splitMobile(null)).toEqual({ country: 'AE', local: '' });
  });
});

describe('money', () => {
  it('stores money as integer minor units, so rounding never drifts', () => {
    expect(toMinorUnits('1499.00')).toBe(149900);
    expect(toMinorUnits('1,499.50')).toBe(149950);
    expect(toMinorUnits('0.1')).toBe(10);
    expect(toMinorUnits('')).toBeNull();
    expect(toMinorUnits(null)).toBeNull();
  });

  it('renders minor units back for display', () => {
    expect(fromMinorUnits(149900)).toBe('1499.00');
    expect(fromMinorUnits(null)).toBe('');
  });
});
