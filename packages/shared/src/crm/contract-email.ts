/**
 * The words of an email about a contract.
 *
 * Pure, so the same function fills a template for the Setup preview, the preview in the send
 * popup and the email that actually goes out; what is previewed is what is sent.
 */

export const CONTRACT_EMAIL_PLACEHOLDERS = [
  ['{contact}', "The recipient's name"],
  ['{customer}', 'The customer company'],
  ['{contract_title}', 'The contract title'],
  ['{contract_number}', 'The contract number'],
  ['{start_date}', 'When the term starts'],
  ['{end_date}', 'When the term ends'],
  ['{days_left}', 'Days until it ends (0 or less once ended)'],
  ['{amount}', 'The amount per billing period, with currency'],
  ['{billing}', 'How often it is billed'],
  ['{company}', 'Your company name'],
] as const;

export type ContractEmailValues = Record<
  | 'contact'
  | 'customer'
  | 'contract_title'
  | 'contract_number'
  | 'start_date'
  | 'end_date'
  | 'days_left'
  | 'amount'
  | 'billing'
  | 'company',
  string
>;

export const SAMPLE_CONTRACT_EMAIL_VALUES: ContractEmailValues = {
  contact: 'Sara Khan',
  customer: 'Artier Dental Centre',
  contract_title: 'R4 Annual Support',
  contract_number: 'C-12',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  days_left: '24',
  amount: 'AED 12,000.00',
  billing: 'Yearly',
  company: 'DigiSol',
};

/** Fills {placeholders}; one that is not recognised is left as typed so the mistake is visible. */
export function fillContractTemplate(template: string, values: ContractEmailValues): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? values[name as keyof ContractEmailValues] : match,
  );
}

/** Which template to offer first: the one that fits where the contract stands. */
export function defaultContractTemplate(status: string): 'renewal' | 'expired' | 'general' {
  if (status === 'expired') return 'expired';
  if (status === 'expiring') return 'renewal';
  return 'general';
}
