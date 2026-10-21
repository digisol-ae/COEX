'use client';

import { SettingsDrawer } from '@/components/ui/settings-drawer';
import { useActionState, useState } from 'react';
import { Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { saveProductAction, type ProductFormState } from './actions';

const initialState: ProductFormState = {};

import type { ProductSummary } from '@/modules/crm/services/product.service';

export function ProductPanel({
  product,
  products = [],
}: {
  product?: ProductSummary;
  products?: ProductSummary[];
}) {
  const [open, setOpen] = useState(false);
  const { showToast } = useToast();
  const [state, formAction, pending] = useActionState(
    async (previous: ProductFormState, formData: FormData) => {
      const result = await saveProductAction(previous, formData);
      if (result.saved) {
        setOpen(false);
        showToast('Product saved.');
      }
      return result;
    },
    initialState,
  );

  if (!open) {
    return (
      <Button variant={product ? 'secondary' : 'primary'} onClick={() => setOpen(true)}>
        {product ? 'Edit product' : 'Add product'}
      </Button>
    );
  }

  return (
    <SettingsDrawer
      title={product ? 'Edit product' : 'New product'}
      open={open}
      onClose={() => setOpen(false)}
    >
      <Card className="w-full">
        <CardSection>
          <form action={formAction} className="space-y-3">
            {product ? <input type="hidden" name="id" value={product.id} /> : null}
            <Field label="Name">
              <Input
                defaultValue={product?.name ?? ''}
                name="name"
                required
                autoFocus
                placeholder="R4+ Practice Management"
              />
            </Field>

            <Field label="Code" hint="Short and permanent, for example R4PLUS">
              <Input defaultValue={product?.code ?? ''} name="code" required />
            </Field>

            <Field label="Type">
              <Select name="kind" defaultValue={product?.kind ?? 'software'}>
                <option value="software">Software</option>
                <option value="module">Module</option>
                <option value="service">Service</option>
                <option value="hardware">Hardware</option>
                <option value="support">Support</option>
              </Select>
            </Field>

            <Field label="Description">
              <Input defaultValue={product?.description ?? ''} name="description" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="List price" hint="Leave empty if it varies">
                <Input
                  defaultValue={
                    product?.listPriceMinorUnits == null
                      ? ''
                      : (product.listPriceMinorUnits / 100).toFixed(2)
                  }
                  name="price"
                  inputMode="decimal"
                  placeholder="1499.00"
                />
              </Field>

              <Field label="Currency">
                <Select name="currency" defaultValue={product?.currency ?? 'AED'}>
                  <option>AED</option>
                  <option>PKR</option>
                  <option>USD</option>
                  <option>SAR</option>
                </Select>
              </Field>
            </div>

            <fieldset className="space-y-1 text-sm">
              <legend className="font-medium">Available service models</legend>
              {(['contractual', 'subscription'] as const).map((model) => (
                <label key={model} className="mr-3 inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="serviceModels"
                    value={model}
                    defaultChecked={!product || product.serviceModels?.includes(model)}
                  />
                  {model === 'contractual' ? 'Contractual' : 'Subscription'}
                </label>
              ))}
            </fieldset>
            <Field
              label="Parent product"
              hint="For modules such as dOne modules; otherwise leave empty"
            >
              <Select name="parentProductId" defaultValue={product?.parentProductId ?? ''}>
                <option value="">No parent product</option>
                {products
                  .filter(
                    (p) => p.id !== product?.id && p.kind !== 'module' && p.status === 'active',
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Billing">
              <Select name="billingPeriod" defaultValue={product?.billingPeriod ?? 'once'}>
                <option value="once">One off</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </Field>

            {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving' : product ? 'Save product' : 'Add product'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </form>
        </CardSection>
      </Card>
    </SettingsDrawer>
  );
}
