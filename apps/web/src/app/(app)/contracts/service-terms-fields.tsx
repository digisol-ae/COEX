'use client';
import { money } from '@coex/shared/crm/service-terms';
import { useState } from 'react';
import { Button, Field, Input, Select } from '@/components/ui';
export interface TermsValues {
  pricingMethod?: string;
  licenceValue?: string;
  annualSupportPercent?: string;
  setupFee?: string;
  trainingFee?: string;
  hardwareTerms?: string;
  serviceLines?: { productId: string; description: string; quantity: number; unitPrice: string }[];
}
export function ServiceTermsFields({
  seed,
  products,
  subscription,
}: {
  seed?: TermsValues;
  products: { id: string; name: string }[];
  subscription: boolean;
}) {
  const [method, setMethod] = useState(seed?.pricingMethod ?? 'fixed');
  const [lines, setLines] = useState(seed?.serviceLines ?? []);
  const lineTotal = lines.reduce((sum, line) => {
    try {
      return sum + money(line.unitPrice, 'Unit price') * line.quantity;
    } catch {
      return sum;
    }
  }, 0);
  return (
    <fieldset className="space-y-3 rounded-lg border border-[var(--color-line)] p-3">
      <legend className="px-1 font-medium">Service pricing</legend>
      <Field label="Pricing method">
        <Select
          name="pricingMethod"
          value={subscription ? 'fixed' : method}
          onChange={(e) => setMethod(e.target.value)}
        >
          <option value="fixed">Fixed amount / product rates</option>
          {!subscription ? (
            <option value="licence_percentage">Annual percentage of perpetual licence value</option>
          ) : null}
        </Select>
      </Field>
      {!subscription && method === 'licence_percentage' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Perpetual licence value">
            <Input
              name="licenceValue"
              inputMode="decimal"
              required
              defaultValue={seed?.licenceValue}
            />
          </Field>
          <Field
            label="Annual support %"
            hint="Annual charge is split across the selected billing cycle"
          >
            <Input
              name="annualSupportPercent"
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              required
              defaultValue={seed?.annualSupportPercent}
            />
          </Field>
        </div>
      ) : (
        <>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Add products or modules with quantities and rates per billing period. Their total
            replaces the fixed amount above. Leave empty to use a single agreement amount.
          </p>
          <input type="hidden" name="serviceLines" value={JSON.stringify(lines)} />
          {lines.map((line, index) => (
            <div key={index} className="space-y-2 rounded border border-[var(--color-line)] p-2">
              <Field label={`Product / module ${index + 1}`}>
                <Select
                  value={line.productId}
                  onChange={(e) =>
                    setLines(
                      lines.map((row, i) =>
                        i === index ? { ...row, productId: e.target.value } : row,
                      ),
                    )
                  }
                  required
                >
                  <option value="">Choose a product / module</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Quantity">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={line.quantity}
                    onChange={(e) =>
                      setLines(
                        lines.map((row, i) =>
                          i === index ? { ...row, quantity: Number(e.target.value) } : row,
                        ),
                      )
                    }
                  />
                </Field>
                <Field label="Unit price per billing period">
                  <Input
                    inputMode="decimal"
                    value={line.unitPrice}
                    onChange={(e) =>
                      setLines(
                        lines.map((row, i) =>
                          i === index ? { ...row, unitPrice: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </Field>
              </div>
              <Field label="Coverage / module details">
                <Input
                  value={line.description}
                  onChange={(e) =>
                    setLines(
                      lines.map((row, i) =>
                        i === index ? { ...row, description: e.target.value } : row,
                      ),
                    )
                  }
                />
              </Field>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setLines(lines.filter((_, i) => i !== index))}
              >
                Remove item
              </Button>
            </div>
          ))}
          {lines.length ? (
            <p className="text-sm font-semibold">
              Total per billing period: {(lineTotal / 100).toFixed(2)} (agreement currency)
            </p>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setLines([...lines, { productId: '', description: '', quantity: 1, unitPrice: '' }])
            }
          >
            Add product / module
          </Button>
        </>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Setup charge" hint="One-time upfront charge">
          <Input name="setupFee" inputMode="decimal" defaultValue={seed?.setupFee} />
        </Field>
        <Field label="Training charge" hint="One-time upfront charge">
          <Input name="trainingFee" inputMode="decimal" defaultValue={seed?.trainingFee} />
        </Field>
      </div>
      <Field
        label="Hardware ownership / return terms"
        hint="Record who owns a subscribed server and what happens at the end"
      >
        <Input name="hardwareTerms" defaultValue={seed?.hardwareTerms} />
      </Field>
    </fieldset>
  );
}
