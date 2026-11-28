'use client';
import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, Select, Textarea, Notice } from '@/components/ui';
import { payrollAction } from './actions';
import type { PayrollField } from './fields';
export function PayrollForm({
  intent,
  kind,
  fields = [],
  values = {},
  hidden = {},
  label = 'Save',
}: {
  intent: string;
  kind?: string;
  fields?: PayrollField[];
  values?: Record<string, unknown>;
  hidden?: Record<string, string>;
  label?: string;
}) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    },
    [],
  );
  const [state, action, pending] = useActionState(payrollAction, {});
  const router = useRouter();
  useEffect(() => {
    if (state.success) {
      if (state.goto) router.push(state.goto);
      else router.refresh();
    }
  }, [state, router]);
  const get = (key: string) =>
    key
      .split('.')
      .reduce<unknown>(
        (obj, k) =>
          obj && typeof obj === 'object' ? (obj as Record<string, unknown>)[k] : undefined,
        values,
      );
  return (
    <form
      action={action}
      onChange={
        intent === 'input'
          ? (event) => {
              const form = event.currentTarget;
              if (saveTimer.current) clearTimeout(saveTimer.current);
              saveTimer.current = setTimeout(() => form.requestSubmit(), 600);
            }
          : undefined
      }
      className="space-y-3"
    >
      <input type="hidden" name="intent" value={intent} />
      {kind && <input type="hidden" name="recordKind" value={kind} />}
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      {values.id != null && <input type="hidden" name="id" value={String(values.id)} />}
      {values.version != null && (
        <input type="hidden" name="version" value={String(values.version)} />
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => {
          const value = get(field.key) ?? field.value;
          const props = { name: field.key, required: field.required };
          if (field.type === 'checkbox')
            return (
              <label className="flex items-center gap-2 text-sm" key={field.key}>
                <input type="checkbox" name={field.key} defaultChecked={Boolean(value)} />
                {field.label}
              </label>
            );
          return (
            <Field key={field.key} label={field.label}>
              {field.type === 'select' || field.type === 'multiple' ? (
                <Select
                  {...props}
                  multiple={field.type === 'multiple'}
                  defaultValue={
                    Array.isArray(value) ? value.map(String) : value == null ? '' : String(value)
                  }
                >
                  {field.type !== 'multiple' && <option value="">Choose…</option>}
                  {field.options?.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              ) : field.type === 'textarea' ? (
                <Textarea
                  {...props}
                  defaultValue={Array.isArray(value) ? value.join('\n') : String(value ?? '')}
                />
              ) : field.type === 'file' ? (
                <Input {...props} type="file" accept={field.accept ?? '.xlsx'} />
              ) : (
                <Input
                  {...props}
                  type={field.type ?? 'text'}
                  step={field.type === 'number' ? (field.step ?? '0.01') : undefined}
                  defaultValue={String(value ?? '')}
                />
              )}
            </Field>
          );
        })}
      </div>
      {state.error && <Notice tone="alert">{state.error}</Notice>}
      {state.message && <Notice tone="info">{state.message}</Notice>}
      <Button type="submit" disabled={pending} loading={pending}>
        {label}
      </Button>
    </form>
  );
}
