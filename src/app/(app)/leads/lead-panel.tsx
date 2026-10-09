'use client';

import { useActionState, useState } from 'react';
import { Button, Field, Input, Notice, Select } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import { useToast } from '@/components/ui/toast';
import { MobileInput } from '@/modules/crm/components/mobile-input';
import { CustomFields, type CustomFieldValues } from '@/modules/crm/components/custom-fields';
import type { FieldDefinitionSummary } from '@/modules/crm/services/field-definition.service';
import { splitMobile } from '@/modules/crm/phone';
import { saveLeadAction, type LeadFormState } from './actions';

export interface LeadFormValues {
  id: string;
  name: string;
  company: string;
  email: string;
  mobile: string;
  source: string;
  ownerId: string;
  notes: string;
  customFields: CustomFieldValues;
}

const initialState: LeadFormState = {};

const KIND_LABEL = { lead: 'Lead', customer: 'Customer', contact: 'Contact' } as const;
const REASON_LABEL = {
  email: 'same email',
  mobile: 'same mobile',
  company: 'same company',
} as const;

export function LeadPanel({
  sources,
  owners,
  currentUserId,
  fields,
  lead,
}: {
  sources: string[];
  owners: { id: string; name: string }[];
  currentUserId: string;
  fields: FieldDefinitionSummary[];
  lead?: LeadFormValues;
}) {
  const [open, setOpen] = useState(false);
  const { showToast } = useToast();
  const [state, formAction, pending] = useActionState(
    async (previous: LeadFormState, formData: FormData) => {
      const result = await saveLeadAction(previous, formData);
      if (result.saved) {
        setOpen(false);
        showToast('Lead saved.');
      }
      return result;
    },
    initialState,
  );

  // After an error the form shows what was submitted; otherwise the lead being edited.
  const kept = state.values;
  const text = (field: string, fallback: string | null | undefined = '') =>
    kept?.[field] ?? fallback ?? '';

  if (!open) {
    return lead ? (
      <IconButton icon="edit" label="Edit lead" onClick={() => setOpen(true)} />
    ) : (
      <Button onClick={() => setOpen(true)}>Add lead</Button>
    );
  }

  const stored = splitMobile(lead?.mobile);
  // A source that was later removed from the list still shows on the lead that carries it.
  const sourceChoices =
    lead?.source && !sources.includes(lead.source) ? [...sources, lead.source] : sources;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 popup-backdrop-light">
      <div className="popup-glass-gradient max-h-[90vh] w-full max-w-xl overflow-y-auto p-5 text-left">
        <h2 className="font-medium">{lead ? `Edit ${lead.name}` : 'New lead'}</h2>

        <form action={formAction} className="mt-3 space-y-3" autoComplete="off">
          {lead ? <input type="hidden" name="id" value={lead.id} /> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input name="name" required defaultValue={text('name', lead?.name)} />
            </Field>
            <Field label="Company">
              <Input name="company" defaultValue={text('company', lead?.company)} />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email">
              <Input name="email" type="email" defaultValue={text('email', lead?.email)} />
            </Field>
            <Field label="Mobile" hint="Stored with the country code, so WhatsApp can find it">
              <MobileInput
                key={`mobile-${text('mobile')}`}
                defaultCountry={text('mobileCountry', stored.country)}
                defaultValue={text('mobile', stored.local)}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Source">
              <Select
                key={`source-${text('source')}`}
                name="source"
                defaultValue={text('source', lead?.source)}
              >
                <option value="">Not set</option>
                {sourceChoices.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Owner" hint="The salesperson responsible">
              <Select
                key={`owner-${text('ownerId')}`}
                name="ownerId"
                defaultValue={text('ownerId', lead?.ownerId ?? currentUserId)}
              >
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Notes">
            <Input name="notes" defaultValue={text('notes', lead?.notes)} />
          </Field>

          <CustomFields fields={fields} values={lead?.customFields ?? {}} />

          {state.duplicates?.length ? (
            <Notice tone="warn">
              <p className="font-medium">This looks like someone already in COEX:</p>
              <ul className="mt-1 list-disc pl-5">
                {state.duplicates.map((duplicate) => (
                  <li key={`${duplicate.kind}-${duplicate.id}`}>
                    {KIND_LABEL[duplicate.kind]}: {duplicate.label} (
                    {duplicate.reasons.map((reason) => REASON_LABEL[reason]).join(', ')})
                  </li>
                ))}
              </ul>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input type="checkbox" name="confirmDuplicates" value="yes" />
                Save it as a new lead anyway
              </label>
            </Notice>
          ) : null}

          {state.error && !state.duplicates?.length ? (
            <Notice tone="alert">{state.error}</Notice>
          ) : null}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving' : 'Save lead'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
