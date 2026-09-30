'use client';

import { useActionState, useState } from 'react';
import { Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { createPersonalTaskAction, type TaskFormState } from './actions';

const initialState: TaskFormState = {};

/** A quick personal capture: the private backing Space is created only when it is first needed. */
export function PersonalTaskPanel() {
  const [open, setOpen] = useState(false);
  const { showToast } = useToast();
  const [state, formAction, pending] = useActionState(
    async (previous: TaskFormState, formData: FormData) => {
      const result = await createPersonalTaskAction(previous, formData);
      if (result.saved) {
        setOpen(false);
        showToast('Task created in My tasks.');
      }
      return result;
    },
    initialState,
  );

  if (!open) return <Button onClick={() => setOpen(true)}>Add task</Button>;

  return (
    <Card className="mb-4">
      <CardSection title="New personal task">
        <form action={formAction} className="grid gap-3 sm:grid-cols-3">
          <Field label="Task">
            <Input name="title" required autoFocus placeholder="What needs to be done?" />
          </Field>
          <Field label="Due">
            <Input name="endAt" type="datetime-local" />
          </Field>
          <Field label="Priority">
            <Select name="priority" defaultValue="normal">
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </Select>
          </Field>
          {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
          <div className="flex gap-2 sm:col-span-3">
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating' : 'Create task'}
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
