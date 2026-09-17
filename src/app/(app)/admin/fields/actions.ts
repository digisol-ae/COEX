'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import {
  createFieldDefinition,
  setFieldStatus,
  type FieldEntity,
  type FieldType,
} from '@/modules/crm/services/field-definition.service';

export interface FieldFormState {
  error?: string;
  saved?: boolean;
}

const ENTITIES = ['organisation', 'contact', 'location', 'task', 'ticket'] as const;
const TYPES = ['text', 'number', 'date', 'select', 'checkbox'] as const;

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? '').trim();
}

export async function createFieldAction(
  _previous: FieldFormState,
  formData: FormData,
): Promise<FieldFormState> {
  const actor = await requirePermission('tenant.manage');

  const entityType = text(formData, 'entityType');
  const type = text(formData, 'type');

  if (!(ENTITIES as readonly string[]).includes(entityType)) {
    return { error: 'Choose which record this field belongs to.' };
  }

  if (!(TYPES as readonly string[]).includes(type)) {
    return { error: 'Choose a field type.' };
  }

  const options = text(formData, 'options')
    .split('\n')
    .map((option) => option.trim())
    .filter(Boolean);

  try {
    await asUser(actor, () =>
      createFieldDefinition({
        entityType: entityType as FieldEntity,
        type: type as FieldType,
        label: text(formData, 'label'),
        options,
        required: formData.get('required') === 'on',
        helpText: text(formData, 'helpText'),
        sortOrder: Number(text(formData, 'sortOrder') || 0),
      }),
    );
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not create the field.' };
  }

  revalidatePath('/admin/fields');
  return { saved: true };
}

export async function toggleFieldAction(formData: FormData): Promise<void> {
  const actor = await requirePermission('tenant.manage');
  const status = text(formData, 'status') === 'active' ? 'hidden' : 'active';

  await asUser(actor, () => setFieldStatus(text(formData, 'id'), status));

  revalidatePath('/admin/fields');
}
