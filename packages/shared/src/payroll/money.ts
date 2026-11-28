// Money calculations use safe integer minor units and half-away-from-zero rounding.
export type Minor = number;
function safe(value: number): Minor {
  if (!Number.isSafeInteger(value)) throw new Error('Unsafe currency amount');
  return value;
}
export const toMinor = (amount: number): Minor => {
  if (!Number.isFinite(amount)) throw new Error('Invalid currency amount');
  // Decimal exponent shifting avoids 1.005 * 100 becoming 100.49999999999999.
  const [coefficient, exponent = '0'] = Math.abs(amount).toString().split('e');
  const scaled = Number(`${coefficient}e${Number(exponent) + 2}`);
  return safe((amount < 0 ? -1 : 1) * Math.round(scaled));
};
export const fromMinor = (minor: Minor): number => safe(minor) / 100;
export const mulRatio = (minor: Minor, ratio: number): Minor => {
  const value = minor * ratio;
  const absolute = Math.abs(value);
  const floor = Math.floor(absolute);
  const isHalf = Math.abs(absolute - floor - 0.5) <= Math.min(1e-7, Number.EPSILON * absolute * 2);
  return safe((value < 0 ? -1 : 1) * (isHalf ? floor + 1 : Math.round(absolute)));
};
export const sum = (values: Minor[]): Minor =>
  values.reduce((total, value) => safe(total + value), 0);
