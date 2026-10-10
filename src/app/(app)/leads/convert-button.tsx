'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button, Field, Input, Notice, Select } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import { convertLeadAction } from './actions';

/**
 * Turns a lead into a customer, a contact and, if wanted, an opportunity. The lead stays in the
 * list as converted. An existing customer can be chosen instead of creating a new one.
 */
export function ConvertButton({
  leadId,
  leadName,
  defaultCustomerName,
  customers,
  canCreateOpportunity,
}: {
  leadId: string;
  leadName: string;
  defaultCustomerName: string;
  customers: { id: string; name: string }[];
  canCreateOpportunity: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [existingId, setExistingId] = useState('');
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [withOpportunity, setWithOpportunity] = useState(false);
  const [title, setTitle] = useState('');
  const [oneOff, setOneOff] = useState('');
  const [recurring, setRecurring] = useState('');
  const [currency, setCurrency] = useState('AED');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ organisationId: string; opportunityId: string | null } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  if (!open) {
    return <IconButton icon="customer" label="Convert to customer" onClick={() => setOpen(true)} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 popup-backdrop-light">
      <div className="popup-glass-gradient max-h-[90vh] w-full max-w-lg overflow-y-auto p-5 text-left">
        <h2 className="font-medium">Convert {leadName}</h2>

        {done ? (
          <div className="mt-3 space-y-3">
            <Notice>The lead is now a customer.</Notice>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link className="underline" href={`/customers/${done.organisationId}`}>
                Open the customer
              </Link>
              {done.opportunityId ? (
                <Link className="underline" href={`/opportunities/${done.opportunityId}`}>
                  Open the opportunity
                </Link>
              ) : null}
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                router.refresh();
              }}
            >
              Close
            </Button>
          </div>
        ) : (
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = await convertLeadAction(leadId, {
                  organisationId: existingId || undefined,
                  newCustomerName: existingId ? undefined : customerName,
                  opportunity: withOpportunity ? { title, oneOff, recurring, currency } : undefined,
                });
                if (result.error) {
                  setError(result.error);
                  return;
                }
                setError(null);
                setDone({
                  organisationId: result.organisationId!,
                  opportunityId: result.opportunityId ?? null,
                });
              });
            }}
          >
            <Field label="Add to an existing customer" hint="Leave empty to create a new customer">
              <Select value={existingId} onChange={(event) => setExistingId(event.target.value)}>
                <option value="">Create a new customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </Select>
            </Field>

            {existingId ? null : (
              <Field label="New customer name">
                <Input
                  value={customerName}
                  required
                  onChange={(event) => setCustomerName(event.target.value)}
                />
              </Field>
            )}

            {canCreateOpportunity ? (
              <>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={withOpportunity}
                    onChange={(event) => setWithOpportunity(event.target.checked)}
                  />
                  Also open an opportunity
                </label>
                {withOpportunity ? (
                  <div className="space-y-3">
                    <Field label="Opportunity title">
                      <Input
                        value={title}
                        required
                        onChange={(event) => setTitle(event.target.value)}
                      />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="One-off value">
                        <Input
                          value={oneOff}
                          inputMode="decimal"
                          onChange={(event) => setOneOff(event.target.value)}
                        />
                      </Field>
                      <Field label="Recurring per year">
                        <Input
                          value={recurring}
                          inputMode="decimal"
                          onChange={(event) => setRecurring(event.target.value)}
                        />
                      </Field>
                      <Field label="Currency">
                        <Select
                          value={currency}
                          onChange={(event) => setCurrency(event.target.value)}
                        >
                          <option>AED</option>
                          <option>USD</option>
                          <option>PKR</option>
                          <option>SAR</option>
                        </Select>
                      </Field>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            {error ? <Notice tone="alert">{error}</Notice> : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? 'Converting' : 'Convert'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
