'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button, Field, Input, Notice, Select } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import { useToast } from '@/components/ui/toast';
import { saveOpportunityAction, type OpportunityFormState } from './actions';

export interface OpportunityFormValues {
  id: string;
  organisationId: string;
  contactId: string;
  title: string;
  ownerId: string;
  oneOff: string;
  recurring: string;
  currency: string;
  expectedCloseDate: string;
  probability: string;
  productIds: string[];
  nextStep: string;
  nextStepDate: string;
  quoteReference: string;
  notes: string;
}

const initialState: OpportunityFormState = {};

export function OpportunityPanel({
  organisations,
  products,
  owners,
  openStages,
  currentUserId,
  opportunity,
}: {
  organisations: { id: string; name: string }[];
  products: { id: string; name: string; code: string }[];
  owners: { id: string; name: string }[];
  openStages: { id: string; name: string; probability: number }[];
  currentUserId: string;
  opportunity?: OpportunityFormValues;
}) {
  const [open, setOpen] = useState(false);
  const [organisationId, setOrganisationId] = useState(opportunity?.organisationId ?? '');
  const [contacts, setContacts] = useState<{
    organisationId: string;
    list: { id: string; name: string }[];
  }>({ organisationId: '', list: [] });
  const { showToast } = useToast();
  const [state, formAction, pending] = useActionState(
    async (previous: OpportunityFormState, formData: FormData) => {
      const result = await saveOpportunityAction(previous, formData);
      if (result.saved) {
        setOpen(false);
        showToast('Opportunity saved.');
      }
      return result;
    },
    initialState,
  );

  // The customer's contacts, for choosing who the deal is with.
  useEffect(() => {
    if (!open || !organisationId) return;
    let current = true;

    fetch(`/api/crm/contacts?organisationId=${organisationId}`)
      .then((response) => (response.ok ? response.json() : { contacts: [] }))
      .then((data: { contacts: { id: string; name: string }[] }) => {
        if (current) setContacts({ organisationId, list: data.contacts });
      })
      .catch(() => undefined);

    return () => {
      current = false;
    };
  }, [open, organisationId]);

  const contactChoices = contacts.organisationId === organisationId ? contacts.list : [];
  const kept = state.values;
  const text = (field: string, fallback: string | null | undefined = '') => {
    const value = kept?.[field];
    return typeof value === 'string' ? value : (fallback ?? '');
  };

  if (!open) {
    return opportunity ? (
      <IconButton icon="edit" label="Edit opportunity" onClick={() => setOpen(true)} />
    ) : (
      <Button onClick={() => setOpen(true)}>Add opportunity</Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 popup-backdrop-light">
      <div className="popup-glass-gradient max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5 text-left">
        <h2 className="font-medium">
          {opportunity ? `Edit ${opportunity.title}` : 'New opportunity'}
        </h2>

        <form action={formAction} className="mt-3 space-y-3" autoComplete="off">
          {opportunity ? <input type="hidden" name="id" value={opportunity.id} /> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer">
              <Select
                key={`organisationId-${text('organisationId')}`}
                name="organisationId"
                required
                defaultValue={text('organisationId', opportunity?.organisationId)}
                onChange={(event) => setOrganisationId(event.target.value)}
              >
                <option value="" disabled>
                  Choose a customer
                </option>
                {organisations.map((organisation) => (
                  <option key={organisation.id} value={organisation.id}>
                    {organisation.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Contact">
              <Select
                key={`contact-${organisationId}-${text('contactId')}`}
                name="contactId"
                defaultValue={text('contactId', opportunity?.contactId)}
              >
                <option value="">Not set</option>
                {contactChoices.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Title" hint="For example: R4+ rollout, three clinics">
            <Input name="title" required defaultValue={text('title', opportunity?.title)} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            {opportunity ? null : (
              <Field label="Stage">
                <Select
                  key={`stage-${text('stageId')}`}
                  name="stageId"
                  defaultValue={text('stageId')}
                >
                  {openStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name} ({stage.probability}%)
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Owner" hint="Defaults to the customer's owner">
              <Select
                key={`owner-${text('ownerId')}`}
                name="ownerId"
                defaultValue={text('ownerId', opportunity?.ownerId ?? currentUserId)}
              >
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Chance of winning (%)" hint="Left empty, it follows the stage">
              <Input
                name="probability"
                inputMode="numeric"
                defaultValue={text('probability', opportunity?.probability)}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="One-off value" hint="Licence, setup">
              <Input
                name="oneOff"
                inputMode="decimal"
                defaultValue={text('oneOff', opportunity?.oneOff)}
              />
            </Field>
            <Field label="Recurring value per year" hint="AMC, subscription">
              <Input
                name="recurring"
                inputMode="decimal"
                defaultValue={text('recurring', opportunity?.recurring)}
              />
            </Field>
            <Field label="Currency">
              <Select
                key={`currency-${text('currency')}`}
                name="currency"
                defaultValue={text('currency', opportunity?.currency ?? 'AED')}
              >
                <option>AED</option>
                <option>USD</option>
                <option>PKR</option>
                <option>SAR</option>
              </Select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Expected close date">
              <Input
                type="date"
                name="expectedCloseDate"
                defaultValue={text('expectedCloseDate', opportunity?.expectedCloseDate)}
              />
            </Field>
            <Field label="Zoho Books quote number" hint="Quotes are made in Zoho Books">
              <Input
                name="quoteReference"
                defaultValue={text('quoteReference', opportunity?.quoteReference)}
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Next step">
              <Input name="nextStep" defaultValue={text('nextStep', opportunity?.nextStep)} />
            </Field>
            <Field label="Next step date">
              <Input
                type="date"
                name="nextStepDate"
                defaultValue={text('nextStepDate', opportunity?.nextStepDate)}
              />
            </Field>
          </div>

          <fieldset>
            <legend className="mb-1 text-sm font-medium">Products</legend>
            <div className="grid max-h-32 gap-1 overflow-y-auto sm:grid-cols-2">
              {products.map((product) => (
                <label key={product.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="productIds"
                    value={product.id}
                    defaultChecked={
                      Array.isArray(kept?.productIds)
                        ? kept.productIds.includes(product.id)
                        : opportunity?.productIds.includes(product.id)
                    }
                  />
                  {product.name}
                </label>
              ))}
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Field label="Not listed? Add a product" hint="Name">
                <Input name="newProductName" defaultValue={text('newProductName')} />
              </Field>
              <Field label=" " hint="Code, for example R4PLUS">
                <Input name="newProductCode" defaultValue={text('newProductCode')} />
              </Field>
            </div>
          </fieldset>

          <Field label="Notes">
            <Input name="notes" defaultValue={text('notes', opportunity?.notes)} />
          </Field>

          {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving' : 'Save opportunity'}
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
