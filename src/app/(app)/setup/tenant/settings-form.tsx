'use client';

import { useActionState } from 'react';
import { Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import { saveTenantSettingsAction, type TenantFormState } from './actions';

const initialState: TenantFormState = {};

const TIMEZONES = ['Asia/Dubai', 'Asia/Karachi', 'Asia/Riyadh', 'Europe/London', 'UTC'];
const CURRENCIES = ['AED', 'PKR', 'USD', 'SAR', 'GBP'];

export function TenantSettingsForm({
  defaults,
}: {
  defaults: {
    name: string;
    slug: string;
    timezone: string;
    currency: string;
    taskPrefix: string;
    ticketPrefix: string;
    attachmentRetentionMonths: number;
  };
}) {
  const [state, formAction, pending] = useActionState(saveTenantSettingsAction, initialState);

  return (
    <form action={formAction}>
      <Card>
        <CardSection title="Identity">
          <div className="space-y-4">
            <Field label="Tenant name">
              <Input name="name" defaultValue={defaults.name} required />
            </Field>

            <Field label="Identifier" hint="Fixed after creation. Used in links and subdomains.">
              <Input defaultValue={defaults.slug} disabled />
            </Field>
          </div>
        </CardSection>

        <CardSection title="Regional">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Timezone" hint="Timestamps are stored in UTC and shown in this zone.">
              <Select name="timezone" defaultValue={defaults.timezone}>
                {TIMEZONES.map((zone) => (
                  <option key={zone}>{zone}</option>
                ))}
              </Select>
            </Field>

            <Field label="Currency">
              <Select name="currency" defaultValue={defaults.currency}>
                {CURRENCIES.map((code) => (
                  <option key={code}>{code}</option>
                ))}
              </Select>
            </Field>
          </div>
        </CardSection>

        <CardSection title="Numbering and retention">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Task prefix" hint="For example DGS-T-1042">
              <Input name="taskPrefix" defaultValue={defaults.taskPrefix} required />
            </Field>

            <Field label="Ticket prefix">
              <Input name="ticketPrefix" defaultValue={defaults.ticketPrefix} required />
            </Field>

            <Field label="Keep attachments" hint="Months">
              <Input
                name="attachmentRetentionMonths"
                type="number"
                min={1}
                max={120}
                defaultValue={defaults.attachmentRetentionMonths}
                required
              />
            </Field>
          </div>
        </CardSection>

        <CardSection>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving' : 'Save settings'}
            </Button>
            {state.saved ? <Notice tone="ok">Saved.</Notice> : null}
            {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
          </div>
        </CardSection>
      </Card>
    </form>
  );
}
