'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import {
  DuplicateLeadError,
  archiveLead,
  createLead,
  disqualifyLead,
  startWorkingLead,
  updateLead,
  type LeadDuplicate,
  type LeadInput,
} from '@/modules/crm/services/lead.service';
import {
  listFieldDefinitions,
  readCustomFieldValues,
} from '@/modules/crm/services/field-definition.service';

export interface LeadFormState {
  error?: string;
  saved?: boolean;
  /** Who the lead looks like, with the form kept so the person can save it anyway. */
  duplicates?: LeadDuplicate[];
  /** What was submitted, because React clears a form after every submit (John, 4 Oct 2026). */
  values?: Record<string, string>;
}

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? '').trim();
}

function submittedValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') values[key] = value;
  }

  return values;
}

export async function saveLeadAction(
  _previous: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const actor = await requirePermission('lead.manage');
  const id = text(formData, 'id');

  try {
    await asUser(actor, async () => {
      const fields = await listFieldDefinitions('lead');

      const input: LeadInput = {
        name: text(formData, 'name'),
        company: text(formData, 'company'),
        email: text(formData, 'email'),
        mobile: text(formData, 'mobile'),
        mobileCountry: text(formData, 'mobileCountry'),
        source: text(formData, 'source'),
        ownerId: text(formData, 'ownerId'),
        notes: text(formData, 'notes'),
        customFields: readCustomFieldValues(fields, formData),
      };

      if (id) await updateLead(id, input);
      else
        await createLead(input, { confirmDuplicates: formData.get('confirmDuplicates') === 'yes' });
    });
  } catch (error) {
    if (error instanceof DuplicateLeadError) {
      return {
        error: error.message,
        duplicates: error.duplicates,
        values: submittedValues(formData),
      };
    }

    return {
      error: error instanceof Error ? error.message : 'Could not save the lead.',
      values: submittedValues(formData),
    };
  }

  revalidatePath('/leads');
  return { saved: true };
}

export async function startWorkingLeadAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('lead.manage');

  await asUser(actor, () => startWorkingLead(text(formData, 'id')));
  revalidatePath('/leads');
}

export async function disqualifyLeadAction(
  id: string,
  reason: string,
): Promise<{ error?: string }> {
  const actor = await requirePermission('lead.manage');

  try {
    await asUser(actor, () => disqualifyLead(id, reason));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not disqualify the lead.' };
  }

  revalidatePath('/leads');
  return {};
}

export async function archiveLeadAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('lead.manage');

  await asUser(actor, () => archiveLead(text(formData, 'id')));
  revalidatePath('/leads');
}
