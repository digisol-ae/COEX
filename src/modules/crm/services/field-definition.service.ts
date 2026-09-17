import { connectToDatabase } from '@/lib/db';
import { repository } from '@/lib/repository';
import { recordAudit } from '@/modules/core/services/audit.service';
import { FieldDefinitionModel } from '../models/field-definition.model';

/**
 * Per tenant custom fields.
 *
 * A client tenant extends customers, contacts, tasks and tickets without a code change, which is
 * what makes COEX sellable to a company whose process differs from DigiSol's.
 *
 * The key is generated from the label once and then frozen. Renaming a label is cosmetic; renaming
 * a key would orphan every value already stored against it.
 */

const definitions = () => repository(FieldDefinitionModel);

export type FieldEntity = 'organisation' | 'contact' | 'location' | 'task' | 'ticket';
export type FieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox';

export interface FieldDefinitionSummary {
  id: string;
  entityType: FieldEntity;
  key: string;
  label: string;
  type: FieldType;
  options: string[];
  required: boolean;
  helpText: string | null;
  sortOrder: number;
  status: string;
}

export async function listFieldDefinitions(
  entityType?: FieldEntity,
  includeHidden = false,
): Promise<FieldDefinitionSummary[]> {
  await connectToDatabase();

  const query: Record<string, unknown> = {};
  if (entityType) query.entityType = entityType;
  if (!includeHidden) query.status = 'active';

  const found = await definitions().find(query).sort({ entityType: 1, sortOrder: 1, label: 1 });

  return found.map((field) => ({
    id: String(field._id),
    entityType: field.entityType as FieldEntity,
    key: field.key,
    label: field.label,
    type: field.type as FieldType,
    options: field.options ?? [],
    required: field.required ?? false,
    helpText: field.helpText ?? null,
    sortOrder: field.sortOrder ?? 0,
    status: field.status,
  }));
}

export function keyFromLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

export interface FieldDefinitionInput {
  entityType: FieldEntity;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  helpText?: string;
  sortOrder?: number;
}

export async function createFieldDefinition(input: FieldDefinitionInput): Promise<void> {
  await connectToDatabase();

  const key = keyFromLabel(input.label);

  if (!key) {
    throw new Error('Give the field a name using letters or numbers.');
  }

  if (input.type === 'select' && (input.options?.length ?? 0) === 0) {
    throw new Error('A choice field needs at least one option.');
  }

  const existing = await definitions().findOne({ entityType: input.entityType, key });

  if (existing) {
    throw new Error('A field with that name already exists on this record type.');
  }

  const created = await definitions().create({
    entityType: input.entityType,
    key,
    label: input.label.trim(),
    type: input.type,
    options: input.options ?? [],
    required: input.required ?? false,
    helpText: input.helpText?.trim() || null,
    sortOrder: input.sortOrder ?? 0,
  });

  await recordAudit({
    action: 'field_definition.created',
    entityType: 'FieldDefinition',
    entityId: created._id,
    after: { entityType: created.entityType, key: created.key, type: created.type },
  });
}

/** Hidden rather than deleted, so values already stored against the key are never orphaned. */
export async function setFieldStatus(id: string, status: 'active' | 'hidden'): Promise<void> {
  await connectToDatabase();

  const field = await definitions().updateOne({ _id: id }, { $set: { status } });
  if (!field) throw new Error('Field not found.');

  await recordAudit({
    action: status === 'hidden' ? 'field_definition.hidden' : 'field_definition.shown',
    entityType: 'FieldDefinition',
    entityId: field._id,
    after: { key: field.key, status },
  });
}

/**
 * Reads submitted values for a record type, validating against the definitions.
 *
 * Validation lives here rather than in each form, so a field added tomorrow is enforced everywhere
 * that record is saved.
 */
export function readCustomFieldValues(
  fields: FieldDefinitionSummary[],
  formData: FormData,
): Record<string, string | number | boolean | Date | null> {
  const values: Record<string, string | number | boolean | Date | null> = {};

  for (const field of fields) {
    const raw = formData.get(`custom_${field.key}`);

    if (field.type === 'checkbox') {
      values[field.key] = raw === 'on';
      continue;
    }

    const text = String(raw ?? '').trim();

    if (!text) {
      if (field.required) {
        throw new Error(`${field.label} is required.`);
      }

      values[field.key] = null;
      continue;
    }

    if (field.type === 'number') {
      const amount = Number(text);

      if (Number.isNaN(amount)) {
        throw new Error(`${field.label} must be a number.`);
      }

      values[field.key] = amount;
      continue;
    }

    if (field.type === 'date') {
      const date = new Date(text);

      if (Number.isNaN(date.getTime())) {
        throw new Error(`${field.label} must be a date.`);
      }

      values[field.key] = date;
      continue;
    }

    if (field.type === 'select' && !field.options.includes(text)) {
      throw new Error(`${field.label} must be one of the listed options.`);
    }

    values[field.key] = text;
  }

  return values;
}
