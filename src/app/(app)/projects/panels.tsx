'use client';

import { useActionState, useState } from 'react';
import { Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import { createProjectAction, type TaskFormState } from '../tasks/actions';

const initialState: TaskFormState = {};

export function NewProjectPanel({ customers }: { customers: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createProjectAction, initialState);

  if (!open) {
    return <Button onClick={() => setOpen(true)}>Add project</Button>;
  }

  return (
    <Card className="w-full sm:w-96">
      <CardSection title="New project">
        <form action={formAction} className="space-y-3">
          <Field label="Name" hint="For example dOne Platform or Project Management">
            <Input name="name" required autoFocus />
          </Field>

          <Field label="Description">
            <Input name="description" />
          </Field>

          <Field
            label="Phases"
            hint="Optional, separated by commas. For example Discovery, Design, Development, Testing"
          >
            <Input name="phases" placeholder="Discovery, Design, Development, Testing" />
          </Field>

          <Field label="Customer" hint="Optional. Work then shows on their timeline.">
            <Select name="organisationId" defaultValue="">
              <option value="">None</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Due date">
            <Input name="dueDate" type="date" />
          </Field>

          {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating' : 'Create'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardSection>
    </Card>
  );
}
