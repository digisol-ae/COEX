'use client';

import { useActionState, useState } from 'react';
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
}: {
  organisations: { id: string; name: string }[];
  products: { id: string; name: string; code: string }[];
  contract?: ContractFormValues;
}) {
  const [open, setOpen] = useState(false);
  const [endDate, setEndDate] = useState(contract?.endDate ?? '');
  const [supportHours, setSupportHours] = useState(contract?.supportHoursEnabled ?? false);
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
              <Select name="organisationId" required defaultValue={contract?.organisationId ?? ''}>
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
              <Select name="type" defaultValue={contract?.type ?? 'amc'}>
                <option value="amc">Annual maintenance (AMC)</option>
                <option value="project">Project</option>
                <option value="subscription">Subscription</option>
              </Select>
            </Field>
          </div>

          <Field label="Title">
            <Input name="title" required defaultValue={contract?.title} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Starts">
              <Input
                type="date"
                name="startDate"
                required
                defaultValue={contract?.startDate}
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
              <Select name="billingFrequency" defaultValue={contract?.billingFrequency ?? 'yearly'}>
                <option value="monthly">Monthly</option>
                <option value="bimonthly">Every two months</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Amount per billing period" hint="Invoicing itself stays in Zoho Books">
              <Input name="value" inputMode="decimal" defaultValue={contract?.value} />
            </Field>
            <Field label="Currency">
              <Select name="currency" defaultValue={contract?.currency ?? 'AED'}>
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
                    defaultChecked={contract?.productIds.includes(product.id)}
                  />
                  {product.name}
                </label>
              ))}
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Field label="Not listed? Add a product" hint="Name">
                <Input name="newProductName" />
              </Field>
              <Field label=" " hint="Code, for example R4PLUS">
                <Input name="newProductCode" />
              </Field>
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Contract document link" hint="A Microsoft 365 link, never a file">
              <Input name="documentUrl" type="url" defaultValue={contract?.documentUrl} />
            </Field>
            <Field label="Zoho Books reference">
              <Input name="zohoReference" defaultValue={contract?.zohoReference} />
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
                defaultValue={contract?.includedHoursPerPeriod}
                className="w-56"
              />
            ) : null}
          </div>

          <Field label="Notes">
            <Input name="notes" defaultValue={contract?.notes} />
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
