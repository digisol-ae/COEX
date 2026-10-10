'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Button, Field, Input, Notice, Select } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import { useToast } from '@/components/ui/toast';
import { moveOpportunityAction } from './actions';

export interface StageChoice {
  id: string;
  name: string;
  kind: 'open' | 'won' | 'lost';
}

interface MoveDialogProps {
  opportunityId: string;
  title: string;
  currentStageId: string;
  /** The stage the dialog opens on, for a card dropped onto a column. */
  initialStageId?: string;
  closed: boolean;
  stages: StageChoice[];
  lostReasons: string[];
  /** Offered after a win, so the sale can become a contract without retyping it. */
  canCreateContract?: boolean;
  onClose: () => void;
}

/** Lost asks why, reopening a closed deal asks for a reason, and a win offers a contract. */
export function MoveDialog({
  opportunityId,
  title,
  currentStageId,
  initialStageId,
  closed,
  stages,
  lostReasons,
  canCreateContract,
  onClose,
}: MoveDialogProps) {
  const [stageId, setStageId] = useState(initialStageId ?? currentStageId);
  const [lostReason, setLostReason] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [won, setWon] = useState(false);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  const target = stages.find((stage) => stage.id === stageId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 popup-backdrop">
      <div className="popup-glass w-full max-w-md p-5 text-left">
        <h2 className="font-medium">Move {title}</h2>

        {won ? (
          <div className="mt-3 space-y-3">
            <Notice>Won. Well done.</Notice>
            {canCreateContract ? (
              <p className="text-sm">
                <Link className="underline" href={`/opportunities/${opportunityId}?contract=1`}>
                  Create the contract for this sale
                </Link>{' '}
                (optional, prefilled with the customer, products and value).
              </p>
            ) : null}
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <form
            className="mt-3 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(async () => {
                const result = await moveOpportunityAction(opportunityId, stageId, {
                  lostReason,
                  reopenReason,
                });
                if (result.error) {
                  setError(result.error);
                  return;
                }
                setError(null);
                showToast('Opportunity moved.');
                if (target?.kind === 'won') setWon(true);
                else onClose();
              });
            }}
          >
            <Field label="Stage">
              <Select value={stageId} onChange={(event) => setStageId(event.target.value)}>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </Select>
            </Field>

            {target?.kind === 'lost' ? (
              <Field label="Why was it lost?">
                <Select
                  value={lostReason}
                  required
                  onChange={(event) => setLostReason(event.target.value)}
                >
                  <option value="" disabled>
                    Choose a reason
                  </option>
                  {lostReasons.map((reason) => (
                    <option key={reason}>{reason}</option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {closed ? (
              <Field label="Why is it reopened?" hint="Recorded in the history">
                <Input
                  value={reopenReason}
                  required
                  onChange={(event) => setReopenReason(event.target.value)}
                />
              </Field>
            ) : null}

            {error ? <Notice tone="alert">{error}</Notice> : null}

            <div className="flex gap-2">
              <Button type="submit" disabled={pending || stageId === currentStageId}>
                {pending ? 'Saving' : 'Move'}
              </Button>
              <Button type="button" variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/** The icon on a row or card that opens the move dialog. */
export function MoveButton({
  canReopen,
  closed,
  ...dialog
}: Omit<MoveDialogProps, 'onClose' | 'initialStageId'> & { canReopen: boolean }) {
  const [open, setOpen] = useState(false);

  // Someone without the reopen permission can still see a closed deal, but not move it.
  if (closed && !canReopen) return null;

  return (
    <>
      <IconButton icon="status" label="Move to another stage" onClick={() => setOpen(true)} />
      {open ? <MoveDialog {...dialog} closed={closed} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
