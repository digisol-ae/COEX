import { columns, type Entity } from './spec';
import { toCsv } from './csv';

export const instructions: Record<Entity, string[]> = {
  customers: [
    'Required: name. kind: client, prospect, supplier or partner (lowercase).',
    'country: two uppercase letters, e.g. AE, OM or QA. website: full http:// or https:// URL.',
    'Name or email matches need review. A shared email can belong to separate branches.',
  ],
  contacts: [
    'Required: name and customer or customerId. customer must match exactly one existing customer name. If names are repeated, use customerId from the customer export (_id column). When both are filled they must refer to the same customer.',
    'country: two uppercase letters, e.g. AE. Use an international mobile number (+971…) or a local number with its country. isPrimary: true or false.',
    'Contacts match by name, email or normalized mobile within the same customer. Import customers first. Primary contacts become the default reply recipient. CSV import does not create portal logins.',
  ],
  tasks: [
    'Required: title, space. space must match one active, visible shared Space name.',
    'priority: low, normal, high or urgent. Times: ISO with timezone, e.g. 2026-11-01T09:00:00+04:00. estimateMinutes: whole minutes.',
    'Optional customer: exact customer name. Matches use Space and title.',
  ],
  tickets: [
    'Required: subject, queue, body. queue must match one active support queue name.',
    'priority: low, normal, high or urgent. Optional customer: exact customer name. Matches use queue and subject.',
  ],
  leads: [
    'Required: name. mobileCountry: two uppercase letters, e.g. AE.',
    'source: a configured lead source or blank. Matches use name/company and existing CRM name, email or mobile rules.',
  ],
  products: [
    'Required: name, code. kind: software, module, service, hardware or support.',
    'price: decimal amount without thousands separators, e.g. 1250.50. currency: three uppercase letters, e.g. AED.',
    'billingPeriod: once, monthly, quarterly or yearly. Matches use code; codes must remain unique.',
  ],
  contracts: [
    'Required: title, customer, startDate, endDate. customer must match exactly one customer name.',
    'Dates: YYYY-MM-DD; endDate must be on or after startDate. type: amc, project or subscription.',
    'billingFrequency: monthly, bimonthly, quarterly or yearly. value: decimal amount, e.g. 1250.50. currency: AED or another three-letter code.',
    'productCodes: existing active codes separated with |. documentUrl: full https:// URL. Matches use customer, title and dates.',
  ],
};

export const examples: Record<Entity, Record<string, string>[]> = {
  customers: [
    {
      name: 'Example Dental Clinic',
      kind: 'client',
      email: 'office@example.test',
      phone: '0097140000000',
      website: 'https://example.com',
      country: 'AE',
    },
    {
      name: 'Example Dental Clinic - Oman',
      kind: 'prospect',
      email: 'oman@example.test',
      country: 'OM',
    },
  ],
  contacts: [
    {
      customer: 'Example Dental Clinic',
      name: 'Example Contact One',
      title: 'Practice Manager',
      email: 'contact.one@example.test',
      mobile: '+971500000001',
      country: 'AE',
      isPrimary: 'true',
    },
    {
      customer: 'Example Dental Clinic',
      name: 'Example Contact Two',
      title: 'Receptionist',
      email: 'contact.two@example.test',
      mobile: '+971500000002',
      country: 'AE',
      isPrimary: 'false',
    },
  ],
  tasks: [
    {
      title: 'Example installation',
      space: 'Replace with your Space name',
      priority: 'normal',
      startAt: '2026-11-01T09:00:00+04:00',
      endAt: '2026-11-01T10:00:00+04:00',
      estimateMinutes: '60',
      customer: 'Example Dental Clinic',
    },
    {
      title: 'Example follow-up',
      space: 'Replace with your Space name',
      priority: 'high',
      estimateMinutes: '30',
    },
  ],
  tickets: [
    {
      subject: 'Example support request',
      queue: 'Replace with your queue name',
      body: 'Describe the issue here.',
      priority: 'normal',
      customer: 'Example Dental Clinic',
    },
    {
      subject: 'Example urgent request',
      queue: 'Replace with your queue name',
      body: 'Describe the urgent issue here.',
      priority: 'urgent',
    },
  ],
  leads: [
    {
      name: 'Example Lead One',
      company: 'Example Clinic',
      email: 'lead.one@example.test',
      mobileCountry: 'AE',
    },
    {
      name: 'Example Lead Two',
      company: 'Example Company',
      email: 'lead.two@example.test',
      mobileCountry: 'OM',
    },
  ],
  products: [
    {
      name: 'Example Software',
      code: 'EXAMPLE-SOFTWARE',
      kind: 'software',
      price: '1250.50',
      currency: 'AED',
      billingPeriod: 'once',
    },
    {
      name: 'Example Support',
      code: 'EXAMPLE-SUPPORT',
      kind: 'support',
      price: '100.00',
      currency: 'AED',
      billingPeriod: 'monthly',
    },
  ],
  contracts: [
    {
      title: 'Example Annual Maintenance',
      customer: 'Example Dental Clinic',
      type: 'amc',
      startDate: '2026-11-01',
      endDate: '2027-10-31',
      billingFrequency: 'yearly',
      value: '1250.50',
      currency: 'AED',
      productCodes: 'EXAMPLE-SOFTWARE|EXAMPLE-SUPPORT',
    },
    {
      title: 'Example Subscription',
      customer: 'Example Dental Clinic',
      type: 'subscription',
      startDate: '2026-11-01',
      endDate: '2027-10-31',
      billingFrequency: 'monthly',
      value: '100.00',
      currency: 'AED',
    },
  ],
};
export function templateCsv(entity: Entity) {
  return toCsv(
    ['_example', ...columns(entity)],
    examples[entity].map((row) => ({
      _example: 'EXAMPLE ONLY - DELETE THIS ROW BEFORE IMPORT',
      ...row,
    })),
  );
}
