/** Agreement placeholders are plain text; values are substituted once, never evaluated as HTML. */
export function agreementTokens(body: string): string[] {
  return [...new Set([...body.matchAll(/\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g)].map((m) => m[1]))];
}
export function populateAgreement(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g, (token, key: string) =>
    values[key]?.trim() ? values[key] : token,
  );
}
export function validateAgreement(body: string): void {
  if (!body.trim()) throw new Error('Enter the agreement text.');
  if (body.length > 150000) throw new Error('Use at most 150,000 characters.');
}
export function assertAgreementComplete(body: string): void {
  validateAgreement(body);
  if (/\{\{|\}\}/.test(body))
    throw new Error('Complete every placeholder before marking this draft reviewed.');
}
export interface AgreementTemplate {
  id: string;
  name: string;
  type: 'amc' | 'subscription' | 'project';
  body: string;
  reviewNotes: string;
  revision: number;
  builtin: boolean;
}
