'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import {
  archiveContract,
  createContract,
  prepareContractEmail,
  renewContract,
  sendContractEmail,
  setContractStatus,
  setPeriodInvoiced,
  updateContract,
  type BillingFrequency,
  type ContractEmailDraft,
  type ContractInput,
  type ContractType,
} from '@/modules/crm/services/contract.service';
import { createProduct } from '@/modules/crm/services/product.service';
import { BILLING_FREQUENCIES, CONTRACT_TYPES } from '@coex/shared/crm/models/contract.model';

export interface ContractFormState {
  error?: string;
  saved?: boolean;
  /**
   * What was submitted, sent back with an error. React clears a form after every submit, so
   * without this a mistake wipes everything the person typed (John, 4 Oct 2026).
   */
  values?: Record<string, string | string[]>;
}

function submittedValues(formData: FormData): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value !== 'string') continue;
    if (key === 'productIds') {
      const list = values.productIds;
      values.productIds = [...(Array.isArray(list) ? list : []), value];
    } else {
      values[key] = value;
    }
  }

  return values;
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
        if (!newName || !newCode)
          throw new Error(
            'To add a product that is not listed, fill in both its name and its code. Otherwise leave both empty.',
          );
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
        contactIds: formData.getAll('contactIds').map(String),
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
    return {
      error: error instanceof Error ? error.message : 'Could not save the contract.',
      values: submittedValues(formData),
    };
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

export async function prepareContractEmailAction(
  id: string,
): Promise<{ draft?: ContractEmailDraft; error?: string }> {
  const actor = await requirePermission('contract.manage');

  try {
    return { draft: await asUser(actor, () => prepareContractEmail(id)) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not prepare the email.' };
  }
}

export async function sendContractEmailAction(
  id: string,
  subject: string,
  body: string,
): Promise<{ message?: string; error?: string }> {
  const actor = await requirePermission('contract.manage');

  try {
    const { queued, skipped } = await asUser(actor, () => sendContractEmail(id, { subject, body }));
    revalidatePath('/contracts');

    return {
      message:
        `Email queued for ${queued} contact${queued === 1 ? '' : 's'}.` +
        (skipped.length ? ` No email address for ${skipped.join(', ')}.` : ''),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not send the email.' };
  }
}
