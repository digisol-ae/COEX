import { toMinor } from './money';
/** Engine amounts are major units with integer minor-unit arithmetic. Storage is explicit. */
const money = new Set([
  'package',
  'amount',
  'principal',
  'recovered',
  'monthlyCap',
  'originalAmount',
  'gross',
  'totalDeductions',
  'net',
  'due',
  'unitRate',
  'itemApprovalLimit',
  'paidAmount',
]);
export function encodeMoney(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(encodeMoney);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, v]) => {
      if (key === 'yearToDate' && v && typeof v === 'object')
        return [
          'yearToDateMinorUnits',
          Object.fromEntries(
            Object.entries(v).map(([employeeId, totals]) => [
              employeeId,
              Object.fromEntries(
                Object.entries(totals as Record<string, number>).map(([code, amount]) => [
                  code,
                  minor(amount),
                ]),
              ),
            ]),
          ),
        ];
      if ((key === 'amounts' || key === 'approvalLimits') && v && typeof v === 'object')
        return [
          `${key}MinorUnits`,
          Object.fromEntries(Object.entries(v).map(([k, x]) => [k, minor(Number(x))])),
        ];
      return money.has(key) && typeof v === 'number'
        ? [`${key}MinorUnits`, minor(v)]
        : [key, encodeMoney(v)];
    }),
  );
}
export function decodeMoney(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeMoney);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, v]) => {
      if (key === 'yearToDateMinorUnits' && v && typeof v === 'object')
        return [
          'yearToDate',
          Object.fromEntries(
            Object.entries(v).map(([employeeId, totals]) => [
              employeeId,
              Object.fromEntries(
                Object.entries(totals as Record<string, number>).map(([code, amount]) => [
                  code,
                  amount / 100,
                ]),
              ),
            ]),
          ),
        ];
      if (
        (key === 'amountsMinorUnits' || key === 'approvalLimitsMinorUnits') &&
        v &&
        typeof v === 'object'
      )
        return [
          key.replace(/MinorUnits$/, ''),
          Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Number(x) / 100])),
        ];
      const base = key.replace(/MinorUnits$/, '');
      return key.endsWith('MinorUnits') && money.has(base) && typeof v === 'number'
        ? [base, v / 100]
        : [key, decodeMoney(v)];
    }),
  );
}
function minor(value: number) {
  const n = toMinor(value);
  if (!Number.isFinite(value) || !Number.isSafeInteger(n))
    throw new Error('Invalid or unsafe money amount.');
  return n;
}
