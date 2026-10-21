'use client';

import { useState, type ReactNode } from 'react';
import { IconButton } from '@/components/ui/icon-button';
import { FactBadge, FactRow } from '@/components/ui/fact-badge';

/**
 * A customer's details as a row of badges, with the form behind an edit icon in a popup (John's
 * team, 18 Oct 2026: a tall form beside the history was too much room for a few fields). The form
 * is passed in as the children, already built by the page.
 */
export function CustomerSummary({
  organisation,
  editable,
  children,
}: {
  organisation: {
    industry: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    expiryWarningDays: number;
  };
  editable: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <FactRow>
            {organisation.industry ? (
              <FactBadge icon="building" label="Industry">
                {organisation.industry}
              </FactBadge>
            ) : null}
            {organisation.email ? (
              <FactBadge icon="mail" label="Email" href={`mailto:${organisation.email}`}>
                {organisation.email}
              </FactBadge>
            ) : null}
            {organisation.phone ? (
              <FactBadge icon="phone" label="Phone" href={`tel:${organisation.phone}`}>
                {organisation.phone}
              </FactBadge>
            ) : null}
            {organisation.website ? (
              <FactBadge
                icon="globe"
                label="Website"
                href={
                  /^https?:/.test(organisation.website)
                    ? organisation.website
                    : `https://${organisation.website}`
                }
              >
                {organisation.website}
              </FactBadge>
            ) : null}
            {organisation.address ? (
              <FactBadge icon="pin" label="Address">
                {organisation.address}
              </FactBadge>
            ) : null}
            <FactBadge icon="clock" label="Days before a contract ends that warnings start">
              Contract warning {organisation.expiryWarningDays} days
            </FactBadge>
          </FactRow>
        </div>

        {editable ? (
          <IconButton icon="edit" label="Edit customer" onClick={() => setOpen(true)} />
        ) : null}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="popup-backdrop absolute inset-0"
          />
          <div className="popup-glass relative max-h-[90dvh] w-full max-w-lg space-y-3 overflow-y-auto p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-[var(--color-ink)]">Customer details</h2>
              <IconButton icon="close" label="Close" onClick={() => setOpen(false)} />
            </div>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
