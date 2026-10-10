import { describe, expect, it } from 'vitest';
import { duplicateReasons, isOpenLead, normaliseCompany } from '@coex/shared/crm/lead-rules';

describe('lead rules', () => {
  it('treats only new and working leads as open', () => {
    expect(isOpenLead('new')).toBe(true);
    expect(isOpenLead('working')).toBe(true);
    expect(isOpenLead('converted')).toBe(false);
    expect(isOpenLead('disqualified')).toBe(false);
  });

  it('compares company names without case, punctuation or legal suffix', () => {
    expect(normaliseCompany('Acme Dental L.L.C.')).toBe(normaliseCompany('ACME  dental'));
    expect(normaliseCompany('  ')).toBe('');
    expect(normaliseCompany(null)).toBe('');
  });

  it('reports which details match, and never matches empty values', () => {
    expect(
      duplicateReasons(
        { email: 'A@x.com', mobile: '+971501234567', company: 'Acme LLC' },
        { email: 'a@X.com', mobile: '+971500000000', company: 'acme' },
      ),
    ).toEqual(['email', 'company']);

    expect(
      duplicateReasons({ email: '', mobile: null, company: ' ' }, { email: '', mobile: null }),
    ).toEqual([]);
  });
});
