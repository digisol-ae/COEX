'use client';

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

/** Moves a deal to another stage; Lost asks why, and reopening a closed deal asks for a reason. */
export function MoveButton({
  opportunityId,
  title,
  currentStageId,
  closed,
  canReopen,
  stages,
  lostReasons,
}: {
  opportunityId: string;
  title: string;
  currentStageId: string;
  closed: boolean;
  canReopen: boolean;
  stages: StageChoice[];
  lostReasons: string[];
}) {
  const [open, setOpen] = useState(false);
  const [stageId, setStageId] = useState(currentStageId);
  const [lostReason, setLostReason] = useState('');
  const [reopenReason, setReopenReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { showToast } = useToast();

  // Someone without the reopen permission can still see a closed deal, but not move it.
  if (closed && !canReopen) return null;

  if (!open) {
    return <IconButton icon="status" label="Move to another stage" onClick={() => setOpen(true)} />;
  }

  const target = stages.find((stage) => stage.id === stageId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 popup-backdrop">
      <div className="popup-glass w-full max-w-md p-5 text-left">
        <h2 className="font-medium">Move {title}</h2>

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
              setOpen(false);
              setError(null);
              showToast('Opportunity moved.');
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
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
