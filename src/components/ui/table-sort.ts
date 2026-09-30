export type SortValue = string | number | null;
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });

export function compareSortValues(a: SortValue, b: SortValue) {
  if (a === null || a === '') return b === null || b === '' ? 0 : 1;
  if (b === null || b === '') return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const duration = (v: string) => {
    const m = v.trim().match(/^(?:(\d+)h)?\s*(?:(\d+)m)?$/);
    return m && (m[1] || m[2]) ? Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0) : null;
  };
  const av = duration(String(a)),
    bv = duration(String(b));
  if (av !== null && bv !== null) return av - bv;
  return collator.compare(String(a), String(b));
}
