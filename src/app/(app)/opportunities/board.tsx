'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { clsx } from 'clsx';
import { Notice } from '@/components/ui';
import { useToast } from '@/components/ui/toast';
import { moveOpportunityAction } from './actions';
import { MoveButton, MoveDialog, type StageChoice } from './move-button';

export interface BoardCard {
  id: string;
  number: string;
  title: string;
  organisationName: string;
  ownerName: string;
  status: 'open' | 'won' | 'lost';
  stageId: string;
  value: string;
  nextStep: string | null;
  nextStepDate: string | null;
  flag: 'none' | 'no-step' | 'overdue';
  lostReason: string | null;
}

export interface BoardColumn {
  stage: StageChoice & { probability: number };
  cards: BoardCard[];
}

/**
 * The pipeline as columns of cards. Dragging a card to another open column moves it at once;
 * dropping it on Won or Lost, or moving a closed deal, opens the dialog that asks for what is
 * needed. Nothing works only by drag: every card has the same move button as the list, so
 * keyboard and phone users change the stage the same way.
 */
export function PipelineBoard({
  columns,
  stages,
  lostReasons,
  canMove,
  canReopen,
  canCreateContract,
}: {
  columns: BoardColumn[];
  stages: StageChoice[];
  lostReasons: string[];
  canMove: boolean;
  canReopen: boolean;
  canCreateContract: boolean;
}) {
  const [dragging, setDragging] = useState<BoardCard | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ card: BoardCard; stageId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { showToast } = useToast();

  const drop = (column: BoardColumn) => {
    const card = dragging;
    setDragging(null);
    setOver(null);
    if (!card || card.stageId === column.stage.id) return;

    // Anything that needs an answer goes through the dialog; a plain move between open stages
    // does not.
    if (card.status !== 'open' || column.stage.kind !== 'open') {
      if (card.status !== 'open' && !canReopen) return;
      setDialog({ card, stageId: column.stage.id });
      return;
    }

    startTransition(async () => {
      const result = await moveOpportunityAction(card.id, column.stage.id, {});
      if (result.error) setError(result.error);
      else {
        setError(null);
        showToast('Opportunity moved.');
      }
    });
  };

  return (
    <div>
      {error ? <Notice tone="alert">{error}</Notice> : null}

      <div className="flex gap-3 overflow-x-auto pb-3">
        {columns.map((column) => (
          <section
            key={column.stage.id}
            aria-label={column.stage.name}
            onDragOver={(event) => {
              if (canMove && dragging) {
                event.preventDefault();
                setOver(column.stage.id);
              }
            }}
            onDragLeave={() => setOver((current) => (current === column.stage.id ? null : current))}
            onDrop={() => drop(column)}
            className={clsx(
              'w-64 shrink-0 rounded-[var(--radius-control)] border bg-[var(--color-surface-sunken)] p-2',
              over === column.stage.id ? 'border-[var(--color-ink)]' : 'border-[var(--color-line)]',
            )}
          >
            <header className="mb-2 flex items-baseline justify-between px-1">
              <h3 className="text-sm font-semibold">{column.stage.name}</h3>
              <span className="text-xs text-[var(--color-ink-subtle)] tabular-nums">
                {column.cards.length} · {column.stage.probability}%
              </span>
            </header>

            <ul className="space-y-2">
              {column.cards.map((card) => (
                <li
                  key={card.id}
                  draggable={canMove}
                  onDragStart={() => setDragging(card)}
                  onDragEnd={() => {
                    setDragging(null);
                    setOver(null);
                  }}
                  className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] p-2 text-sm"
                >
                  <div className="flex items-start justify-between gap-1">
                    <Link
                      href={`/opportunities/${card.id}`}
                      className="font-medium hover:underline"
                    >
                      {card.title}
                    </Link>
                    {canMove ? (
                      <MoveButton
                        opportunityId={card.id}
                        title={card.title}
                        currentStageId={card.stageId}
                        closed={card.status !== 'open'}
                        canReopen={canReopen}
                        stages={stages}
                        lostReasons={lostReasons}
                        canCreateContract={canCreateContract}
                      />
                    ) : null}
                  </div>
                  <div className="text-xs text-[var(--color-ink-muted)]">
                    {card.organisationName}
                  </div>
                  <div className="mt-1 text-xs tabular-nums">{card.value}</div>
                  {card.lostReason ? (
                    <div className="text-xs text-[var(--color-ink-subtle)]">{card.lostReason}</div>
                  ) : null}
                  {card.flag === 'no-step' ? (
                    <div className="mt-1 text-xs text-[var(--color-status-warn)]">No next step</div>
                  ) : card.nextStep ? (
                    <div
                      className={clsx(
                        'mt-1 text-xs',
                        card.flag === 'overdue'
                          ? 'text-[var(--color-status-alert)]'
                          : 'text-[var(--color-ink-subtle)]',
                      )}
                    >
                      {card.nextStep}
                      {card.nextStepDate ? ` (${card.nextStepDate})` : ''}
                    </div>
                  ) : null}
                  <div className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                    {card.ownerName}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {dialog ? (
        <MoveDialog
          opportunityId={dialog.card.id}
          title={dialog.card.title}
          currentStageId={dialog.card.stageId}
          initialStageId={dialog.stageId}
          closed={dialog.card.status !== 'open'}
          stages={stages}
          lostReasons={lostReasons}
          canCreateContract={canCreateContract}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}
