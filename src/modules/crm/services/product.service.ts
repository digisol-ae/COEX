import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { recordAudit, changedFields } from '@/modules/core/services/audit.service';
import { ProductModel } from '../models/product.model';

/**
 * What DigiSol sells and supports.
 *
 * Prices are held as integer minor units with an explicit currency, so 199.99 AED is stored as
 * 19999 and never as a floating point number. Phase 1 barely uses the price, but correcting this
 * after Contracts and invoicing exist would be painful, and rounding errors in money are the kind
 * of bug nobody forgives.
 */

const products = () => repository(ProductModel);

export type ProductKind = 'software' | 'module' | 'service' | 'hardware' | 'support';
export type BillingPeriod = 'once' | 'monthly' | 'quarterly' | 'yearly';

export interface ProductSummary {
  id: string;
  name: string;
  code: string;
  kind: ProductKind;
  description: string | null;
  listPriceMinorUnits: number | null;
  currency: string;
  billingPeriod: BillingPeriod;
  status: string;
}

export async function listProducts(includeRetired = false): Promise<ProductSummary[]> {
  await connectToDatabase();

  const found = await products()
    .find(includeRetired ? {} : { status: 'active' as const })
    .sort({ kind: 1, name: 1 });

  return found.map((product) => ({
    id: String(product._id),
    name: product.name,
    code: product.code,
    kind: product.kind as ProductKind,
    description: product.description ?? null,
    listPriceMinorUnits: product.listPriceMinorUnits ?? null,
    currency: product.currency ?? 'AED',
    billingPeriod: (product.billingPeriod ?? 'once') as BillingPeriod,
    status: product.status,
  }));
}

export interface ProductInput {
  name: string;
  code: string;
  kind: ProductKind;
  description?: string;
  price?: string;
  currency?: string;
  billingPeriod?: BillingPeriod;
}

/** Accepts what a person types, such as "1,499.50", and returns minor units. */
export function toMinorUnits(value: string | undefined | null): number | null {
  if (!value?.trim()) return null;

  const cleaned = value.replace(/[^\d.]/g, '');
  if (!cleaned) return null;

  const amount = Number(cleaned);
  if (Number.isNaN(amount)) return null;

  return Math.round(amount * 100);
}

export function fromMinorUnits(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return (value / 100).toFixed(2);
}

export async function createProduct(input: ProductInput): Promise<void> {
  await connectToDatabase();

  const code = input.code.trim().toUpperCase();

  if (await products().findOne({ code })) {
    throw new Error('That product code is already in use.');
  }

  const created = await products().create({
    name: input.name.trim(),
    code,
    kind: input.kind,
    description: input.description?.trim() || null,
    listPriceMinorUnits: toMinorUnits(input.price),
    currency: input.currency || 'AED',
    billingPeriod: input.billingPeriod ?? 'once',
  });

  await recordAudit({
    action: 'product.created',
    entityType: 'Product',
    entityId: created._id,
    after: { name: created.name, code: created.code, kind: created.kind },
  });
}

export async function updateProduct(id: string, input: ProductInput): Promise<void> {
  await connectToDatabase();

  const before = await products().findById(id);
  if (!before) throw new Error('Product not found.');

  const code = input.code.trim().toUpperCase();
  const clash = await products().findOne({ code });

  if (clash && String(clash._id) !== id) {
    throw new Error('That product code is already in use.');
  }

  const after = await products().updateOne(
    { _id: before._id },
    {
      $set: {
        name: input.name.trim(),
        code,
        kind: input.kind,
        description: input.description?.trim() || null,
        listPriceMinorUnits: toMinorUnits(input.price),
        currency: input.currency || 'AED',
        billingPeriod: input.billingPeriod ?? 'once',
      },
    },
  );

  await recordAudit({
    action: 'product.updated',
    entityType: 'Product',
    entityId: before._id,
    ...changedFields(
      { name: before.name, code: before.code, price: before.listPriceMinorUnits },
      { name: after?.name, code: after?.code, price: after?.listPriceMinorUnits },
    ),
  });
}

/** Retired rather than deleted, because contracts and history still refer to it. */
export async function retireProduct(id: string): Promise<void> {
  await connectToDatabase();

  const product = await products().updateOne({ _id: id }, { $set: { status: 'retired' } });
  if (!product) throw new Error('Product not found.');

  await recordAudit({
    action: 'product.retired',
    entityType: 'Product',
    entityId: product._id,
    before: { status: 'active' },
    after: { status: 'retired' },
  });
}

export async function reactivateProduct(id: string): Promise<void> {
  await connectToDatabase();

  const product = await products().updateOne({ _id: id }, { $set: { status: 'active' } });
  if (!product) throw new Error('Product not found.');

  await recordAudit({
    action: 'product.reactivated',
    entityType: 'Product',
    entityId: product._id,
    after: { status: 'active' },
  });
}
