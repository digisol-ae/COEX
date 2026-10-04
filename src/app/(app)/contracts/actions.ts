'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import {
  archiveContract,
  createContract,
  renewContract,
  setContractStatus,
  setPeriodInvoiced,
  updateContract,
  type BillingFrequency,
  type ContractInput,
  type ContractType,
} from '@/modules/crm/services/contract.service';
import { createProduct } from '@/modules/crm/services/product.service';
import { BILLING_FREQUENCIES, CONTRACT_TYPES } from '@/modules/crm/models/contract.model';

export interface ContractFormState {
  error?: string;
  saved?: boolean;
}

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? '').trim();
}

function oneOf<T extends string>(allowed: readonly T[], value: string, fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export async function saveContractAction(
  _previous: ContractFormState,
  formData: FormData,
): Promise<ContractFormState> {
  const actor = await requirePermission('contract.manage');
  const id = text(formData, 'id');
  const hours = text(formData, 'includedHoursPerPeriod');

  try {
    await asUser(actor, async () => {
      const productIds = formData.getAll('productIds').map(String);

      // A product that is not listed yet can be added from the same form, so nobody has to leave
      // the contract to do it (John, 4 Oct 2026). Needs the permission to manage products.
      const newName = text(formData, 'newProductName');
      const newCode = text(formData, 'newProductCode');
      if (newName || newCode) {
        if (!actor.permissions.includes('products.manage')) {
          throw new Error('You may not add products. Ask a manager.');
        }
        if (!newName || !newCode) throw new Error('A new product needs a name and a code.');
        productIds.push(await createProduct({ name: newName, code: newCode, kind: 'support' }));
      }

      const input: ContractInput = {
        organisationId: text(formData, 'organisationId'),
        title: text(formData, 'title'),
        type: oneOf<ContractType>(CONTRACT_TYPES, text(formData, 'type'), 'amc'),
        startDate: text(formData, 'startDate'),
        endDate: text(formData, 'endDate'),
        billingFrequency: oneOf<BillingFrequency>(
          BILLING_FREQUENCIES,
          text(formData, 'billingFrequency'),
          'yearly',
        ),
        value: text(formData, 'value'),
        currency: text(formData, 'currency') || 'AED',
        productIds,
        documentUrl: text(formData, 'documentUrl'),
        zohoReference: text(formData, 'zohoReference'),
        supportHoursEnabled: formData.get('supportHoursEnabled') === 'on',
        includedHoursPerPeriod: hours === '' ? null : Number(hours),
        notes: text(formData, 'notes'),
      };

      if (id) await updateContract(id, input);
      else await createContract(input);
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the contract.' };
  }

  revalidatePath('/contracts');
  return { saved: true };
}

export async function setContractStatusAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('contract.manage');
  const status = text(formData, 'status');

  if (status !== 'draft' && status !== 'active' && status !== 'cancelled') return;

  await asUser(actor, () => setContractStatus(text(formData, 'id'), status));
  revalidatePath('/contracts');
}

export async function archiveContractAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('contract.manage');

  await asUser(actor, () => archiveContract(text(formData, 'id')));
  revalidatePath('/contracts');
}

export async function renewContractAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('contract.manage');

  await asUser(actor, () => renewContract(text(formData, 'id')));
  revalidatePath('/contracts');
}

export async function setPeriodInvoicedAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('contract.manage');
  const id = text(formData, 'id');

  await asUser(actor, () =>
    setPeriodInvoiced(id, Number(text(formData, 'period')), formData.get('invoiced') === 'yes'),
  );
  revalidatePath(`/contracts/${id}`);
}
