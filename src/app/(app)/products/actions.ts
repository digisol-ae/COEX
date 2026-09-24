'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import {
  createProduct,
  reactivateProduct,
  retireProduct,
  updateProduct,
  type BillingPeriod,
  type ProductKind,
} from '@/modules/crm/services/product.service';

export interface ProductFormState {
  error?: string;
  saved?: boolean;
}

const KINDS = ['software', 'module', 'service', 'hardware', 'support'] as const;
const PERIODS = ['once', 'monthly', 'quarterly', 'yearly'] as const;

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? '').trim();
}

function toKind(value: string): ProductKind {
  return (KINDS as readonly string[]).includes(value) ? (value as ProductKind) : 'software';
}

function toPeriod(value: string): BillingPeriod {
  return (PERIODS as readonly string[]).includes(value) ? (value as BillingPeriod) : 'once';
}

export async function saveProductAction(
  _previous: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const actor = await requirePermission('products.manage');
  const id = text(formData, 'id');

  const input = {
    name: text(formData, 'name'),
    code: text(formData, 'code'),
    kind: toKind(text(formData, 'kind')),
    description: text(formData, 'description'),
    price: text(formData, 'price'),
    currency: text(formData, 'currency') || 'AED',
    billingPeriod: toPeriod(text(formData, 'billingPeriod')),
  };

  try {
    await asUser(actor, () => (id ? updateProduct(id, input) : createProduct(input)));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the product.' };
  }

  revalidatePath('/products');
  return { saved: true };
}

export async function toggleProductStatusAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('products.manage');
  const id = text(formData, 'id');
  const status = text(formData, 'status');

  await asUser(actor, () => (status === 'active' ? retireProduct(id) : reactivateProduct(id)));

  revalidatePath('/products');
}
