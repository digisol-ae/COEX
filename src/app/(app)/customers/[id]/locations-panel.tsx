'use client';

import { useActionState, useState } from 'react';
import { Button, Card, CardSection, EmptyState, Field, Input, Notice } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import type { LocationSummary } from '@/modules/crm/services/location.service';
import { addLocationAction, archiveLocationAction, type CrmFormState } from '../actions';

const initialState: CrmFormState = {};

export function LocationsPanel({
  organisationId,
  locations,
  canWrite,
}: {
  organisationId: string;
  locations: LocationSummary[];
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(addLocationAction, initialState);

  return (
    <Card>
      <CardSection title={`Sites · ${locations.length}`}>
        {locations.length === 0 ? (
          <EmptyState message="No sites recorded." />
        ) : (
          <ul className="space-y-3">
            {locations.map((location) => (
              <li key={location.id} className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-[var(--color-ink)]">{location.name}</p>
                  {location.city ? (
                    <p className="text-xs text-[var(--color-ink-muted)]">{location.city}</p>
                  ) : null}
                  {location.referenceCode ? (
                    <p className="text-xs text-[var(--color-ink-subtle)]">
                      {location.referenceCode}
                    </p>
                  ) : null}
                </div>

                {canWrite ? (
                  <form action={archiveLocationAction}>
                    <input type="hidden" name="id" value={location.id} />
                    <input type="hidden" name="organisationId" value={organisationId} />
                    <IconButton type="submit" icon="remove" label="Remove this location" tone="danger" />
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canWrite ? (
          open ? (
            <form
              action={formAction}
              className="mt-4 space-y-3 border-t border-[var(--color-line)] pt-4"
            >
              <input type="hidden" name="organisationId" value={organisationId} />

              <Field label="Site name">
                <Input name="name" required autoFocus />
              </Field>

              <Field label="City">
                <Input name="city" />
              </Field>

              <Field label="Address">
                <Input name="address" />
              </Field>

              <Field label="Phone">
                <Input name="phone" />
              </Field>

              <Field label="Reference" hint="Licence or facility code, if the client uses one">
                <Input name="referenceCode" />
              </Field>

              {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                  {pending ? 'Adding' : 'Add site'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="secondary" className="mt-4" onClick={() => setOpen(true)}>
              Add site
            </Button>
          )
        ) : null}
      </CardSection>
    </Card>
  );
}
