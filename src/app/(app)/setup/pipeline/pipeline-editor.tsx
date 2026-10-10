'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { Button, Card, CardSection, Field, Input, Notice, Textarea } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import { useToast } from '@/components/ui/toast';
import {
  addStageAction,
  moveStageAction,
  removeStageAction,
  saveLostReasonsAction,
  saveStaleDaysAction,
  updateStageAction,
  type PipelineFormState,
} from './actions';

export interface StageRowValues {
  id: string;
  name: string;
  kind: 'open' | 'won' | 'lost';
  probability: number;
  opportunityCount: number;
}

const initialState: PipelineFormState = {};

const KIND_LABEL = { open: '', won: 'Counts as won', lost: 'Counts as lost' } as const;

function StageRow({
  stage,
  first,
  last,
}: {
  stage: StageRowValues;
  first: boolean;
  last: boolean;
}) {
  const { showToast } = useToast();
  const [state, formAction, pending] = useActionState(updateStageAction, initialState);
  const [error, setError] = useState<string | null>(null);
  const [working, startTransition] = useTransition();

  useEffect(() => {
    if (state.saved) showToast('Stage saved.');
  }, [state, showToast]);

  const act = (work: () => Promise<PipelineFormState>) =>
    startTransition(async () => {
      const result = await work();
      setError(result.error ?? null);
    });

  return (
    <li className="py-3">
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="id" value={stage.id} />
        <Field label="Stage">
          <Input name="name" defaultValue={stage.name} required className="w-52" />
        </Field>
        <Field label="Chance %">
          <Input
            name="probability"
            inputMode="numeric"
            defaultValue={String(stage.probability)}
            className="w-20"
          />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending || working}>
          Save
        </Button>
        {stage.kind === 'open' ? (
          <div className="flex items-center gap-1">
            <IconButton
              icon="previous"
              label="Move up"
              disabled={first || working}
              onClick={() => act(() => moveStageAction(stage.id, 'up'))}
            />
            <IconButton
              icon="next"
              label="Move down"
              disabled={last || working}
              onClick={() => act(() => moveStageAction(stage.id, 'down'))}
            />
            <IconButton
              icon="remove"
              label="Remove stage"
              disabled={working}
              onClick={() => act(() => removeStageAction(stage.id))}
            />
          </div>
        ) : null}
        <span className="pb-2 text-xs text-[var(--color-ink-subtle)]">
          {KIND_LABEL[stage.kind]}
          {stage.opportunityCount ? ` · ${stage.opportunityCount} opportunities` : ''}
        </span>
      </form>
      {state.error || error ? <Notice tone="alert">{state.error ?? error}</Notice> : null}
    </li>
  );
}

export function PipelineEditor({
  stages,
  lostReasons,
  staleDays,
}: {
  stages: StageRowValues[];
  lostReasons: string[];
  staleDays: number;
}) {
  const { showToast } = useToast();
  const [added, addAction, adding] = useActionState(addStageAction, initialState);
  const [reasons, reasonsAction, savingReasons] = useActionState(
    saveLostReasonsAction,
    initialState,
  );
  const [stale, staleAction, savingStale] = useActionState(saveStaleDaysAction, initialState);
  const openStages = stages.filter((stage) => stage.kind === 'open');

  useEffect(() => {
    if (added.saved) showToast('Stage added.');
    if (reasons.saved) showToast('Lost reasons saved.');
    if (stale.saved) showToast('Reminder days saved.');
  }, [added, reasons, stale, showToast]);

  return (
    <div className="space-y-4">
      <Card>
        <CardSection title="Stages">
          <ul className="divide-y divide-[var(--color-line)]">
            {stages.map((stage) => (
              <StageRow
                key={stage.id}
                stage={stage}
                first={stage.id === openStages[0]?.id}
                last={stage.id === openStages.at(-1)?.id}
              />
            ))}
          </ul>

          <form
            action={addAction}
            className="mt-4 flex flex-wrap items-end gap-2 border-t border-[var(--color-line)] pt-4"
          >
            <Field label="New stage">
              <Input name="name" required className="w-52" />
            </Field>
            <Field label="Chance %">
              <Input name="probability" inputMode="numeric" defaultValue="50" className="w-20" />
            </Field>
            <Button type="submit" disabled={adding}>
              Add stage
            </Button>
          </form>
          {added.error ? <Notice tone="alert">{added.error}</Notice> : null}
        </CardSection>
      </Card>

      <Card>
        <CardSection title="Lost reasons">
          <form action={reasonsAction} className="space-y-3">
            <Field label="One per line" hint="Offered when a deal is moved to Lost.">
              <Textarea name="reasons" rows={6} defaultValue={lostReasons.join('\n')} />
            </Field>
            {reasons.error ? <Notice tone="alert">{reasons.error}</Notice> : null}
            <Button type="submit" disabled={savingReasons}>
              Save lost reasons
            </Button>
          </form>
        </CardSection>
      </Card>

      <Card>
        <CardSection title="Reminders">
          <p className="mb-3 text-sm text-[var(--color-ink-muted)]">
            The owner is emailed when a next step date arrives, and when an open opportunity has had
            no activity for this many days. Switch either off under Setup, Email.
          </p>
          <form action={staleAction} className="flex flex-wrap items-end gap-2">
            <Field label="Days without activity">
              <Input
                name="days"
                inputMode="numeric"
                defaultValue={String(staleDays)}
                className="w-24"
              />
            </Field>
            <Button type="submit" disabled={savingStale}>
              Save
            </Button>
          </form>
          {stale.error ? <Notice tone="alert">{stale.error}</Notice> : null}
        </CardSection>
      </Card>
    </div>
  );
}
