import { z } from 'zod';
import { COUNTRIES, normaliseMobile } from '@coex/shared/crm/phone';
export const ENTITIES = [
  'tasks',
  'tickets',
  'customers',
  'contacts',
  'leads',
  'products',
  'contracts',
] as const;
export type Entity = (typeof ENTITIES)[number];
const text = z.string().max(10000).default('');
const name = z.string().trim().min(1, 'Required').max(250);
const email = text.refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email');
const money = text.refine(
  (v) => !v || (/^\d+(\.\d{1,2})?$/.test(v) && Number.isSafeInteger(Math.round(Number(v) * 100))),
  'Use a non-negative amount within the supported range, e.g. 1250.50',
);
const currency = z
  .string()
  .regex(/^[A-Z]{3}$/, 'Use a three-letter currency, e.g. AED')
  .default('AED');
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v);
    return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === v;
  }, 'Use a valid YYYY-MM-DD date');
const priority = z.enum(['low', 'normal', 'high', 'urgent']).default('normal');
export const schemas = {
  tasks: z.object({
    title: name,
    space: name,
    description: text,
    priority,
    startAt: text.refine(
      (v) =>
        !v || (/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$/.test(v) && !Number.isNaN(Date.parse(v))),
      'Use ISO time with timezone',
    ),
    endAt: text.refine(
      (v) =>
        !v || (/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$/.test(v) && !Number.isNaN(Date.parse(v))),
      'Use ISO time with timezone',
    ),
    estimateMinutes: text.refine(
      (v) => !v || (/^\d+$/.test(v) && Number(v) <= 1000000),
      'Use whole minutes',
    ),
    customer: text,
  }),
  tickets: z.object({
    subject: name,
    queue: name,
    body: z.string().min(1).max(20000),
    priority,
    customer: text,
  }),
  customers: z.object({
    name,
    kind: z.enum(['client', 'prospect', 'supplier', 'partner']).default('client'),
    email,
    phone: text,
    industry: text,
    website: text.refine((v) => !v || /^https?:\/\//.test(v), 'Use an http:// or https:// website'),
    address: text,
    country: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .default('AE'),
    notes: text,
  }),
  contacts: z.object({
    customer: text,
    customerId: text.refine(
      (v) => !v || /^[a-fA-F0-9]{24}$/.test(v),
      'Use the customer ID from a customer export',
    ),
    name: name.max(120),
    title: text,
    email,
    mobile: text,
    country: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .default('AE'),
    isPrimary: z.enum(['true', 'false']).default('false'),
  }),
  leads: z.object({
    name,
    company: text,
    email,
    mobile: text,
    mobileCountry: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .default('AE'),
    source: text,
    notes: text,
  }),
  products: z.object({
    name,
    code: name,
    kind: z.enum(['software', 'module', 'service', 'hardware', 'support']).default('software'),
    description: text,
    price: money,
    currency,
    billingPeriod: z.enum(['once', 'monthly', 'quarterly', 'yearly']).default('once'),
  }),
  contracts: z.object({
    title: name,
    customer: name,
    type: z.enum(['amc', 'project', 'subscription']).default('amc'),
    startDate: day,
    endDate: day,
    billingFrequency: z.enum(['monthly', 'bimonthly', 'quarterly', 'yearly']).default('yearly'),
    value: money,
    currency,
    productCodes: text,
    documentUrl: text.refine((v) => !v || /^https:\/\//.test(v), 'Use an https:// document link'),
    zohoReference: text,
    notes: text,
  }),
};
export const metadataColumns = [
  '_example',
  '_id',
  '_number',
  '_status',
  '_assignees',
  '_folder',
  '_owner',
] as const;
export const columns = (entity: Entity): string[] => Object.keys(schemas[entity].shape);
export function validateRow(entity: Entity, raw: Record<string, string>) {
  if (raw._example) throw new Error('Remove the example rows before importing your records.');
  const allowed = [...columns(entity), ...metadataColumns];
  const unknown = Object.keys(raw).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new Error('Unknown columns: ' + unknown.join(', '));
  const values = Object.fromEntries(
    Object.entries(raw).filter(([key, value]) => !key.startsWith('_') && value !== ''),
  );
  const result = schemas[entity].safeParse(values);
  if (!result.success)
    throw new Error(result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  if (entity === 'contacts') {
    const d = result.data as z.infer<typeof schemas.contacts>;
    if (!d.customer && !d.customerId)
      throw new Error('customer: Enter a customer name or customerId.');
    if (d.mobile) {
      if (
        !d.mobile.startsWith('+') &&
        !d.mobile.startsWith('00') &&
        !COUNTRIES.some((c) => c.code === d.country)
      )
        throw new Error('Use an international mobile number for this country.');
      const normalized = normaliseMobile(d.mobile, d.country);
      if (!normalized || !/^\+[1-9]\d{6,14}$/.test(normalized))
        throw new Error('mobile: Use a valid international or local mobile number.');
    }
  }
  if (entity === 'contracts') {
    const d = result.data as z.infer<typeof schemas.contracts>;
    if (d.endDate < d.startDate) throw new Error('endDate must be on or after startDate');
  }
  if (entity === 'tasks') {
    const d = result.data as z.infer<typeof schemas.tasks>;
    if (d.startAt && d.endAt && Date.parse(d.endAt) < Date.parse(d.startAt))
      throw new Error('endAt must be on or after startAt');
  }
  return result.data;
}
export function isEntity(value: unknown): value is Entity {
  return typeof value === 'string' && ENTITIES.includes(value as Entity);
}
