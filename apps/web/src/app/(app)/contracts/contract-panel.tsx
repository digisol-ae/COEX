'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button, Field, Input, Notice, Select } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import { useToast } from '@/components/ui/toast';
import { saveContractAction, type ContractFormState } from './actions';

export interface ContractFormValues {
  id: string;
  organisationId: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string;
  billingFrequency: string;
  value: string;
  currency: string;
  productIds: string[];
  contactIds: string[];
  documentUrl: string;
  zohoReference: string;
  supportHoursEnabled: boolean;
  includedHoursPerPeriod: string;
  notes: string;
}

const initialState: ContractFormState = {};

/** One year less a day, the usual AMC term, so the end date is a suggestion and not a chore. */
function yearFrom(startDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  if (!match) return '';

  const end = new Date(Date.UTC(Number(match[1]) + 1, Number(match[2]) - 1, Number(match[3]) - 1));
  return end.toISOString().slice(0, 10);
}

export function ContractPanel({
  organisations,
  products,
  contract,
  prefill,
  defaultOpen = false,
}: {
  organisations: { id: string; name: string }[];
  products: { id: string; name: string; code: string }[];
  contract?: ContractFormValues;
  /** Starting values for a new contract, such as one raised from a won opportunity. */
  prefill?: Partial<ContractFormValues>;
  defaultOpen?: boolean;
}) {
  // Editing shows the stored contract; a new one may start from a prefill. Either way the form
  // reads its defaults from the seed.
  const seed: Partial<ContractFormValues> | undefined = contract ?? prefill;
  const [open, setOpen] = useState(defaultOpen);
  const [endDate, setEndDate] = useState(seed?.endDate ?? '');
  const [organisationId, setOrganisationId] = useState(seed?.organisationId ?? '');
  const [contacts, setContacts] = useState<{
    organisationId: string;
    list: { id: string; name: string; email: string | null }[];
  }>({ organisationId: '', list: [] });
  const [supportHours, setSupportHours] = useState(seed?.supportHoursEnabled ?? false);
  const { showToast } = useToast();
  const [state, formAction, pending] = useActionState(
    async (previous: ContractFormState, formData: FormData) => {
      const result = await saveContractAction(previous, formData);
      if (result.saved) {
        setOpen(false);
        showToast('Contract saved.');
      }
      return result;
    },
    initialState,
  );

  // The customer's contacts, for choosing who is emailed about this contract.
  useEffect(() => {
    if (!open || !organisationId) return;
    let current = true;

    fetch(`/api/crm/contacts?organisationId=${organisationId}`)
      .then((response) => (response.ok ? response.json() : { contacts: [] }))
      .then((data: { contacts: { id: string; name: string; email: string | null }[] }) => {
        if (current) setContacts({ organisationId, list: data.contacts });
      })
      .catch(() => undefined);

    return () => {
      current = false;
    };
  }, [open, organisationId]);

  // Contacts loaded for another customer are not offered for this one.
  const contactChoices = contacts.organisationId === organisationId ? contacts.list : [];

  // After an error the form shows what was submitted; otherwise the contract being edited.
  const kept = state.values;
  const text = (field: string, fallback: string | null | undefined = '') => {
    const value = kept?.[field];
    return typeof value === 'string' ? value : (fallback ?? '');
  };

  if (!open) {
    return contract ? (
      <IconButton icon="edit" label="Edit contract" onClick={() => setOpen(true)} />
    ) : (
      <Button onClick={() => setOpen(true)}>Add contract</Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 popup-backdrop-light">
      <div className="popup-glass-gradient max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5 text-left">
        <h2 className="font-medium">{contract ? `Edit ${contract.title}` : 'New contract'}</h2>

        <form action={formAction} className="mt-3 space-y-3">
          {contract ? <input type="hidden" name="id" value={contract.id} /> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer">
              <Select
                key={`organisationId-${text('organisationId')}`}
                name="organisationId"
                required
                defaultValue={text('organisationId', seed?.organisationId)}
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

            <Field label="Type">
              <Select
                key={`type-${text('type')}`}
                name="type"
                defaultValue={text('type', seed?.type ?? 'amc')}
              >
                <option value="amc">Annual maintenance (AMC)</option>
                <option value="project">Project</option>
                <option value="subscription">Subscription</option>
              </Select>
            </Field>
          </div>

          <Field label="Title">
            <Input name="title" required defaultValue={text('title', seed?.title)} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Starts">
              <Input
                type="date"
                name="startDate"
                required
                defaultValue={text('startDate', seed?.startDate)}
                onChange={(event) => {
                  if (!endDate) setEndDate(yearFrom(event.target.value));
                }}
              />
            </Field>
            <Field label="Ends" hint="A year after the start unless you change it">
              <Input
                type="date"
                name="endDate"
                required
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </Field>
            <Field label="Billed">
              <Select
                key={`billingFrequency-${text('billingFrequency')}`}
                name="billingFrequency"
                defaultValue={text('billingFrequency', seed?.billingFrequency ?? 'yearly')}
              >
                <option value="monthly">Monthly</option>
                <option value="bimonthly">Every two months</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Amount per billing period" hint="Invoicing itself stays in Zoho Books">
              <Input name="value" inputMode="decimal" defaultValue={text('value', seed?.value)} />
            </Field>
            <Field label="Currency">
              <Select
                key={`currency-${text('currency')}`}
                name="currency"
                defaultValue={text('currency', seed?.currency ?? 'AED')}
              >
                <option>AED</option>
                <option>USD</option>
                <option>PKR</option>
                <option>SAR</option>
              </Select>
            </Field>
          </div>

          <fieldset>
            <legend className="mb-1 text-sm font-medium">Covered products</legend>
            <div className="grid max-h-36 gap-1 overflow-y-auto sm:grid-cols-2">
              {products.map((product) => (
                <label key={product.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="productIds"
                    value={product.id}
                    defaultChecked={
                      Array.isArray(kept?.productIds)
                        ? kept.productIds.includes(product.id)
                        : seed?.productIds?.includes(product.id)
                    }
                  />
                  {product.name}
                </label>
              ))}
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Field label="Not listed? Add a product" hint="Name">
                <Input
                  name="newProductName"
                  autoComplete="off"
                  defaultValue={text('newProductName')}
                />
              </Field>
              <Field label=" " hint="Code, for example R4PLUS">
                <Input
                  name="newProductCode"
                  autoComplete="off"
                  defaultValue={text('newProductCode')}
                />
              </Field>
            </div>
          </fieldset>

          <fieldset key={`contacts-${organisationId}`}>
            <legend className="mb-1 text-sm font-medium">Contract contacts</legend>
            <p className="mb-1 text-xs text-[var(--color-ink-subtle)]">
              The people emailed about this contract from the email button.
            </p>
            {organisationId ? (
              contactChoices.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-muted)]">
                  This customer has no contacts yet. Add them on the customer page first.
                </p>
              ) : (
                <div className="grid gap-1 sm:grid-cols-2">
                  {contactChoices.map((person) => (
                    <label key={person.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="contactIds"
                        value={person.id}
                        defaultChecked={
                          Array.isArray(kept?.contactIds)
                            ? kept.contactIds.includes(person.id)
                            : seed?.contactIds?.includes(person.id)
                        }
                      />
                      {person.name}
                      {person.email ? null : (
                        <span className="text-xs text-[var(--color-status-alert)]">(no email)</span>
                      )}
                    </label>
                  ))}
                </div>
              )
            ) : (
              <p className="text-sm text-[var(--color-ink-muted)]">Choose the customer first.</p>
            )}
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Contract document link" hint="A Microsoft 365 link, never a file">
              <Input
                name="documentUrl"
                type="url"
                defaultValue={text('documentUrl', seed?.documentUrl)}
              />
            </Field>
            <Field label="Zoho Books reference">
              <Input
                name="zohoReference"
                defaultValue={text('zohoReference', seed?.zohoReference)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="supportHoursEnabled"
                checked={supportHours}
                onChange={(event) => setSupportHours(event.target.checked)}
              />
              Count support time against this contract
            </label>
            {supportHours ? (
              <Input
                name="includedHoursPerPeriod"
                inputMode="decimal"
                placeholder="Hours per billing period"
                defaultValue={text('includedHoursPerPeriod', seed?.includedHoursPerPeriod)}
                className="w-56"
              />
            ) : null}
          </div>

          <Field label="Notes">
            <Input name="notes" defaultValue={text('notes', seed?.notes)} />
          </Field>

          {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving' : 'Save contract'}
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
