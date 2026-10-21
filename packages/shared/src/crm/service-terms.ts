/** Commercial terms use integer minor units; billing remains external to COEX. */
export const SERVICE_MODELS = ['contractual', 'subscription'] as const;
export type ServiceModel = (typeof SERVICE_MODELS)[number];
export type ServiceLine = {
  productId: string;
  description: string;
  quantity: number;
  unitPriceMinorUnits: number;
};
export type ServiceTermsInput = {
  pricingMethod?: 'fixed' | 'licence_percentage';
  licenceValue?: string;
  annualSupportPercent?: number | null;
  setupFee?: string;
  trainingFee?: string;
  serviceLines?: { productId: string; description?: string; quantity: number; unitPrice: string }[];
  hardwareTerms?: string;
};

export function money(value: string | undefined, label: string): number {
  const text = (value ?? '').trim().replaceAll(',', '');
  if (!text) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(text))
    throw new Error(`${label} must be a positive amount with up to two decimal places.`);
  const [whole, fraction = ''] = text.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result)) throw new Error(`${label} is too large.`);
  return result;
}

export function serviceTerms(
  input: ServiceTermsInput & { type: string; billingFrequency: string; value?: string },
) {
  const pricingMethod = input.pricingMethod ?? 'fixed';
  if (!['fixed', 'licence_percentage'].includes(pricingMethod))
    throw new Error('Choose a pricing method.');
  const licenceValueMinorUnits = money(input.licenceValue, 'Licence value');
  const annualSupportPercent = input.annualSupportPercent ?? null;
  const serviceLines: ServiceLine[] = (input.serviceLines ?? []).map((line) => {
    if (
      !line.productId ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 100000
    )
      throw new Error('Each service line needs a product and a whole quantity from 1 to 100,000.');
    return {
      productId: line.productId,
      description: line.description?.trim() ?? '',
      quantity: line.quantity,
      unitPriceMinorUnits: money(line.unitPrice, 'Unit price'),
    };
  });
  if (serviceLines.length > 100) throw new Error('Use no more than 100 service lines.');
  let valueMinorUnits = serviceLines.length
    ? serviceLines.reduce((sum, line) => sum + line.quantity * line.unitPriceMinorUnits, 0)
    : money(input.value, 'Amount');
  if (pricingMethod === 'licence_percentage') {
    if (input.type === 'subscription')
      throw new Error(
        'Licence percentage is for contractual support. Choose fixed subscription rates.',
      );
    if (serviceLines.length)
      throw new Error('Use either product rates or licence percentage pricing, not both.');
    if (
      !licenceValueMinorUnits ||
      !Number.isFinite(annualSupportPercent) ||
      annualSupportPercent! <= 0 ||
      annualSupportPercent! > 100
    )
      throw new Error(
        'Enter a licence value and annual support percentage greater than 0 and up to 100.',
      );
    const periods = { monthly: 12, bimonthly: 6, quarterly: 4, yearly: 1 }[input.billingFrequency];
    if (!periods) throw new Error('Choose a billing cycle.');
    valueMinorUnits = Math.round((licenceValueMinorUnits * annualSupportPercent!) / 100 / periods);
  }
  if (!Number.isSafeInteger(valueMinorUnits)) throw new Error('The service total is too large.');
  return {
    pricingMethod,
    licenceValueMinorUnits: pricingMethod === 'licence_percentage' ? licenceValueMinorUnits : 0,
    annualSupportPercent: pricingMethod === 'licence_percentage' ? annualSupportPercent : null,
    setupFeeMinorUnits: money(input.setupFee, 'Setup charge'),
    trainingFeeMinorUnits: money(input.trainingFee, 'Training charge'),
    serviceLines,
    hardwareTerms: input.hardwareTerms?.trim() || null,
    valueMinorUnits,
  };
}
