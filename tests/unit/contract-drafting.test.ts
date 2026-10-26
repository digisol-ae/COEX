import { describe, expect, it } from 'vitest';
import {
  agreementTokens,
  populateAgreement,
  assertAgreementComplete,
} from '@coex/shared/crm/contract-drafting';
import { DEFAULT_AGREEMENT_TEMPLATES } from '@coex/shared/crm/agreement-defaults';
describe('agreement drafting', () => {
  it('substitutes once, preserving literal customer text and missing fields', () => {
    expect(
      populateAgreement('{{customer}} {{amount}} {{missing}}', {
        customer: 'A $& {{amount}} <script>',
        amount: 'AED 20',
      }),
    ).toBe('A $& {{amount}} <script> AED 20 {{missing}}');
    expect(agreementTokens('{{ customer }} {{customer}} {{custom_field}}')).toEqual([
      'customer',
      'custom_field',
    ]);
  });
  it('requires all placeholder syntax to be resolved before review', () => {
    expect(() => assertAgreementComplete('Contract {{ customer }}')).toThrow();
    expect(() => assertAgreementComplete('Contract {{BAD}}')).toThrow();
    expect(() => assertAgreementComplete('')).toThrow();
    expect(() => assertAgreementComplete('Complete agreement')).not.toThrow();
  });
  it('provides four complete starters without sample customer names and prices', () => {
    expect(DEFAULT_AGREEMENT_TEMPLATES).toHaveLength(4);
    for (const t of DEFAULT_AGREEMENT_TEMPLATES) {
      expect(t.body.length).toBeGreaterThan(3500);
      expect(t.body).not.toMatch(/CALM CHAIR|NEW YORK DENTAL|24,300|32,300|2027/);
      expect(t.body).toContain('{{customer_name}}');
      expect(t.body).toContain('Signature');
      expect(t.reviewNotes).toBeTruthy();
    }
    expect(DEFAULT_AGREEMENT_TEMPLATES.find((t) => t.id === 'builtin:r4-subscription')?.type).toBe(
      'subscription',
    );
  });
});
