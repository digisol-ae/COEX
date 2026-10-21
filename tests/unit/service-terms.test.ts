import { describe, expect, it } from 'vitest';
import { serviceTerms } from '@coex/shared/crm/service-terms';
const base = { type: 'subscription', billingFrequency: 'monthly' };
describe('service commercial terms', () => {
  it('keeps upfront charges outside recurring module totals', () => {
    const result = serviceTerms({
      ...base,
      value: '999',
      setupFee: '1,000',
      trainingFee: '250',
      serviceLines: [{ productId: 'module', quantity: 3, unitPrice: '99.95' }],
    });
    expect(result.valueMinorUnits).toBe(29985);
    expect(result.setupFeeMinorUnits).toBe(100000);
    expect(result.trainingFeeMinorUnits).toBe(25000);
  });
  it('converts annual perpetual support percentage to each billing cycle', () => {
    for (const [billingFrequency, expected] of [
      ['monthly', 15000],
      ['quarterly', 45000],
      ['yearly', 180000],
    ] as const) {
      expect(
        serviceTerms({
          type: 'amc',
          billingFrequency,
          pricingMethod: 'licence_percentage',
          licenceValue: '12000',
          annualSupportPercent: 15,
        }).valueMinorUnits,
      ).toBe(expected);
    }
  });
  it('rejects ambiguous or invalid commercial amounts', () => {
    expect(() => serviceTerms({ ...base, setupFee: '-2' })).toThrow();
    expect(() => serviceTerms({ ...base, value: '12abc' })).toThrow();
    expect(() => serviceTerms({ ...base, pricingMethod: 'licence_percentage' })).toThrow();
    expect(() =>
      serviceTerms({
        ...base,
        serviceLines: [{ productId: 'module', quantity: 0.5, unitPrice: '10' }],
      }),
    ).toThrow();
    expect(() =>
      serviceTerms({
        ...base,
        type: 'amc',
        pricingMethod: 'licence_percentage',
        licenceValue: '100',
        annualSupportPercent: 101,
      }),
    ).toThrow();
  });
});
