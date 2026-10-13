'use client';

import { useState, useTransition } from 'react';
import { Button, Field, Input, Notice } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import { useToast } from '@/components/ui/toast';
import { disqualifyLeadAction } from './actions';

/** A reason is required, so the decision can be reviewed later; the lead itself is kept. */
export function DisqualifyButton({ leadId, leadName }: { leadId: string; leadName: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  if (!open) {
    return <IconButton icon="remove" label="Disqualify lead" onClick={() => setOpen(true)} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 popup-backdrop">
      <div className="popup-glass w-full max-w-md p-5 text-left">
        <h2 className="font-medium">Disqualify {leadName}</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          The lead stays in the list, marked disqualified, with your reason.
        </p>

        <form
          className="mt-3 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await disqualifyLeadAction(leadId, reason);
              if (result.error) {
                setError(result.error);
                return;
              }
              setOpen(false);
              setReason('');
              setError(null);
              showToast('Lead disqualified.');
            });
          }}
        >
          <Field label="Reason" hint="For example: no budget, chose a competitor, no reply">
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
              autoFocus
            />
          </Field>

          {error ? <Notice tone="alert">{error}</Notice> : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving' : 'Disqualify'}
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
