'use client';

import { useActionState } from 'react';
import { Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import { saveTenantSettingsAction, type TenantFormState } from './actions';

const initialState: TenantFormState = {};

const TIMEZONES = ['Asia/Dubai', 'Asia/Karachi', 'Asia/Riyadh', 'Europe/London', 'UTC'];
const CURRENCIES = ['AED', 'PKR', 'USD', 'SAR', 'GBP'];

const DAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

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
    workingDays: number[];
    dayStart: string;
    dayEnd: string;
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

        <CardSection title="Working calendar">
          <p className="mb-3 text-sm text-[var(--color-ink-muted)]">
            Support response targets are measured in working hours, so a four hour promise made on
            Friday evening lands on Monday morning rather than expiring overnight.
          </p>

          <div className="mb-4 flex flex-wrap gap-3">
            {DAYS.map((day) => (
              <label
                key={day.value}
                className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]"
              >
                <input
                  type="checkbox"
                  name="workingDays"
                  value={day.value}
                  defaultChecked={defaults.workingDays.includes(day.value)}
                />
                {day.label}
              </label>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Day starts">
              <Input name="dayStart" type="time" defaultValue={defaults.dayStart} required />
            </Field>

            <Field label="Day ends">
              <Input name="dayEnd" type="time" defaultValue={defaults.dayEnd} required />
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
