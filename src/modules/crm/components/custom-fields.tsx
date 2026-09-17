'use client';

import { Field, Input, Select } from '@/components/ui';
import type { FieldDefinitionSummary } from '../services/field-definition.service';

/**
 * Renders the tenant's own fields on a record form.
 *
 * Inputs are named custom_<key> so the service can read them back without the form knowing
 * anything about validation, which lives with the definitions.
 */

export type CustomFieldValues = Record<string, string | number | boolean | null>;

export function CustomFields({
  fields,
  values,
}: {
  fields: FieldDefinitionSummary[];
  values: CustomFieldValues;
}) {
  if (fields.length === 0) return null;

  return (
    <div className="space-y-3 border-t border-[var(--color-line)] pt-4">
      {fields.map((field) => {
        const name = `custom_${field.key}`;
        const value = values[field.key];

        if (field.type === 'checkbox') {
          return (
            <label
              key={field.id}
              className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]"
            >
              <input type="checkbox" name={name} defaultChecked={value === true} />
              {field.label}
            </label>
          );
        }

        return (
          <Field key={field.id} label={field.label} hint={field.helpText ?? undefined}>
            {field.type === 'select' ? (
              <Select name={name} defaultValue={value === null ? '' : String(value)}>
                <option value="">Not set</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                name={name}
                type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                required={field.required}
                defaultValue={formatValue(field.type, value)}
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}

function formatValue(type: string, value: string | number | boolean | null): string {
  if (value === null || value === undefined) return '';

  // A date input needs yyyy-mm-dd, whatever the stored form.
  if (type === 'date') {
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  return String(value);
}
