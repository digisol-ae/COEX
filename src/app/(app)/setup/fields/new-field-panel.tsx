'use client';

import { useActionState, useState } from 'react';
import { Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import { createFieldAction, type FieldFormState } from './actions';

const initialState: FieldFormState = {};

export function NewFieldPanel() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('text');
  const [state, formAction, pending] = useActionState(createFieldAction, initialState);

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Add field</Button>;
  }

  return (
    <Card className="w-96">
      <CardSection title="New custom field">
        <form action={formAction} className="space-y-3">
          <Field label="Label" hint="What people see. The internal key is made from this once.">
            <Input name="label" required autoFocus placeholder="Licence number" />
          </Field>

          <Field label="On which record">
            <Select name="entityType" defaultValue="organisation">
              <option value="organisation">Customer</option>
              <option value="contact">Contact</option>
              <option value="location">Site</option>
              <option value="task">Task</option>
              <option value="ticket">Ticket</option>
            </Select>
          </Field>

          <Field label="Type">
            <Select
              name="type"
              value={type}
              onChange={(event) => setType(event.currentTarget.value)}
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="select">Choice</option>
              <option value="checkbox">Yes or no</option>
            </Select>
          </Field>

          {type === 'select' ? (
            <Field label="Options" hint="One per line">
              <textarea
                name="options"
                rows={4}
                className="w-full rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
              />
            </Field>
          ) : null}

          <Field label="Help text" hint="Optional. Shown under the field.">
            <Input name="helpText" />
          </Field>

          <label className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
            <input type="checkbox" name="required" />
            Required
          </label>

          {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
          {state.saved ? <Notice tone="ok">Field added.</Notice> : null}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={pending}>
              {pending ? 'Adding' : 'Add field'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </form>
      </CardSection>
    </Card>
  );
}
