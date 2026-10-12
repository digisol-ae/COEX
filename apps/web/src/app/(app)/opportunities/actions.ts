'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import {
  archiveOpportunity,
  createOpportunity,
  moveOpportunity,
  updateOpportunity,
  type OpportunityInput,
} from '@/modules/crm/services/opportunity.service';
import { createProduct } from '@/modules/crm/services/product.service';

export interface OpportunityFormState {
  error?: string;
  saved?: boolean;
  /** What was submitted, because React clears a form after every submit (John, 4 Oct 2026). */
  values?: Record<string, string | string[]>;
}

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? '').trim();
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

export async function saveOpportunityAction(
  _previous: OpportunityFormState,
  formData: FormData,
): Promise<OpportunityFormState> {
  const actor = await requirePermission('opportunity.manage');
  const id = text(formData, 'id');
  const probability = text(formData, 'probability');

  try {
    await asUser(actor, async () => {
      const productIds = formData.getAll('productIds').map(String);

      // A product that is not listed yet can be added from this form, as on a contract.
      const newName = text(formData, 'newProductName');
      const newCode = text(formData, 'newProductCode');
      if (newName || newCode) {
        if (!actor.permissions.includes('products.manage')) {
          throw new Error('You may not add products. Ask a manager.');
        }
        if (!newName || !newCode) {
          throw new Error(
            'To add a product that is not listed, fill in both its name and its code. Otherwise leave both empty.',
          );
        }
        productIds.push(await createProduct({ name: newName, code: newCode, kind: 'software' }));
      }

      const input: OpportunityInput = {
        organisationId: text(formData, 'organisationId'),
        contactId: text(formData, 'contactId'),
        title: text(formData, 'title'),
        stageId: text(formData, 'stageId'),
        ownerId: text(formData, 'ownerId'),
        oneOff: text(formData, 'oneOff'),
        recurring: text(formData, 'recurring'),
        currency: text(formData, 'currency') || 'AED',
        expectedCloseDate: text(formData, 'expectedCloseDate'),
        probability: probability === '' ? null : Number(probability),
        productIds,
        nextStep: text(formData, 'nextStep'),
        nextStepDate: text(formData, 'nextStepDate'),
        quoteReference: text(formData, 'quoteReference'),
        notes: text(formData, 'notes'),
      };

      if (id) await updateOpportunity(id, input);
      else await createOpportunity(input);
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Could not save the opportunity.',
      values: submittedValues(formData),
    };
  }

  revalidatePath('/opportunities');
  return { saved: true };
}

export async function moveOpportunityAction(
  id: string,
  stageId: string,
  options: { lostReason?: string; reopenReason?: string },
): Promise<{ error?: string }> {
  const actor = await requirePermission('opportunity.manage');

  try {
    await asUser(actor, () => moveOpportunity(id, stageId, options));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not move the opportunity.' };
  }

  revalidatePath('/opportunities');
  revalidatePath(`/opportunities/${id}`);
  return {};
}

export async function archiveOpportunityAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('opportunity.manage');

  await asUser(actor, () => archiveOpportunity(text(formData, 'id')));
  revalidatePath('/opportunities');
}
