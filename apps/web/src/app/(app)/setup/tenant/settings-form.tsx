'use client';
/* eslint-disable @next/next/no-img-element -- Preview the embedded tenant letterhead logo. */

import { useActionState, useEffect } from 'react';
import { Button, Card, CardSection, Field, Input, Notice, Select, Textarea } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
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
  staff,
}: {
  staff: { id: string; name: string }[];
  defaults: {
    name: string;
    slug: string;
    timezone: string;
    currency: string;
    taskPrefix: string;
    ticketPrefix: string;
    leadPrefix: string;
    opportunityPrefix: string;
    leadSources: string;
    attachmentRetentionMonths: number;
    workingDays: number[];
    dayStart: string;
    dayEnd: string;
    agreementSupportPortal: string;
    agreementSupportEmail: string;
    agreementSupportPhone: string;
    agreementSupportWhatsapp: string;
    agreementProviderSignerId: string;
    letterheadAddress: string;
    letterheadContact: string;
    letterheadFooter: string;
    letterheadLogo: string;
    letterheadColor: string;
  };
}) {
  const [state, formAction, pending] = useActionState(saveTenantSettingsAction, initialState);
  const { showToast } = useToast();

  useEffect(() => {
    if (state.saved) showToast('Tenant settings saved.');
  }, [state, showToast]);

  return (
    <form
      action={formAction}
      className="[&_input:not([type=checkbox])]:min-h-12 [&_input]:text-base [&_textarea]:text-base [&_button]:min-h-12 [&_select]:min-h-12 [&_select]:text-base"
    >
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

        <CardSection title="Agreement defaults">
          <div className="space-y-4">
            <Field label="Support portal">
              <Input
                name="agreementSupportPortal"
                defaultValue={defaults.agreementSupportPortal}
                maxLength={300}
              />
            </Field>
            <Field label="Support email">
              <Input
                name="agreementSupportEmail"
                type="email"
                defaultValue={defaults.agreementSupportEmail}
                maxLength={300}
              />
            </Field>
            <Field label="Support phone">
              <Input
                name="agreementSupportPhone"
                type="tel"
                defaultValue={defaults.agreementSupportPhone}
                maxLength={300}
              />
            </Field>
            <Field label="Support WhatsApp">
              <Input
                name="agreementSupportWhatsapp"
                type="tel"
                defaultValue={defaults.agreementSupportWhatsapp}
                maxLength={300}
              />
            </Field>
            <Field label="Default First Party signer">
              <Select
                name="agreementProviderSignerId"
                defaultValue={defaults.agreementProviderSignerId}
              >
                <option value="">Choose when drafting</option>
                {staff.map(({ id, name }) => (
                  <option value={id} key={id}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </CardSection>
        <CardSection title="Contract letterhead">
          <p className="mb-4 text-sm">
            Customer contracts use this tenant’s name, logo, address and footer. Configure the logo
            and address before sending for signature.
          </p>
          <div className="space-y-4">
            {defaults.letterheadLogo && (
              <img
                src={defaults.letterheadLogo}
                alt={`${defaults.name} letterhead logo`}
                className="max-h-24 max-w-full object-contain"
              />
            )}
            <Field
              label="Letterhead logo"
              hint="PNG, JPEG or WebP, up to 2 MB. Leave blank to keep the saved logo."
            >
              <Input name="letterheadLogo" type="file" accept="image/png,image/jpeg,image/webp" />
            </Field>
            <Field label="Letterhead address">
              <Textarea
                name="letterheadAddress"
                rows={3}
                maxLength={2000}
                defaultValue={defaults.letterheadAddress}
              />
            </Field>
            <Field
              label="Letterhead contact details"
              hint="Phone, email, website or registration details."
            >
              <Textarea
                name="letterheadContact"
                rows={3}
                maxLength={1000}
                defaultValue={defaults.letterheadContact}
              />
            </Field>
            <Field label="Letterhead footer">
              <Textarea
                name="letterheadFooter"
                rows={2}
                maxLength={1000}
                defaultValue={defaults.letterheadFooter}
              />
            </Field>
            <Field label="Letterhead colour">
              <Input name="letterheadColor" type="color" defaultValue={defaults.letterheadColor} />
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Task prefix" hint="For example DGS-T-1042">
              <Input name="taskPrefix" defaultValue={defaults.taskPrefix} required />
            </Field>

            <Field label="Ticket prefix">
              <Input name="ticketPrefix" defaultValue={defaults.ticketPrefix} required />
            </Field>

            <Field label="Lead prefix">
              <Input name="leadPrefix" defaultValue={defaults.leadPrefix} required />
            </Field>

            <Field label="Opportunity prefix">
              <Input name="opportunityPrefix" defaultValue={defaults.opportunityPrefix} required />
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

        <CardSection title="Lead sources">
          <Field
            label="Where leads come from"
            hint="One per line. Removing a source here never changes leads already recorded with it."
          >
            <Textarea name="leadSources" rows={6} defaultValue={defaults.leadSources} />
          </Field>
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
            {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
          </div>
        </CardSection>
      </Card>
    </form>
  );
}
