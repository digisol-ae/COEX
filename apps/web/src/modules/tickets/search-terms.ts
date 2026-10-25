/** Literal keyword matching: every term must match; quotes keep a phrase together. */
export function ticketSearchTerms(input: string): string[] {
  const search = input.trim().slice(0, 120);
  if (!search) return [];
  if (/^[+\d\s()./-]+$/.test(search) && search.replace(/\D/g, '').length >= 4) return [search];
  return [
    ...new Set(
      [...search.matchAll(/"([^"]+)"|(\S+)/g)].map((m) => (m[1] ?? m[2]).trim()).filter(Boolean),
    ),
  ];
}
export function literalPattern(term: string): RegExp {
  return new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}
export function phonePattern(term: string): RegExp | null {
  if (!/^[+\d\s()./-]+$/.test(term)) return null;
  let digits = term.replace(/\D/g, '');
  if (digits.length < 4) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  return new RegExp(digits.split('').join('[\\s()+./-]*'));
}
