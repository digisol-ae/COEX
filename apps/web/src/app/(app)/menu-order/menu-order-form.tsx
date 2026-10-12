'use client';

import { useState, useTransition } from 'react';
import { Button, Card, Notice } from '@/components/ui';
import { saveMenuOrderAction } from './actions';

type Group = { id: string; label: string };

export function MenuOrderForm({ groups, standard }: { groups: Group[]; standard: Group[] }) {
  const [order, setOrder] = useState(groups);
  const [saving, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);

  function move(index: number, step: -1 | 1) {
    const target = index + step;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    setMessage(null);
  }

  function save(ids: string[], done: string) {
    startTransition(async () => {
      const result = await saveMenuOrderAction(ids);
      setMessage(result.error ? { tone: 'warn', text: result.error } : { tone: 'ok', text: done });
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <ol className="divide-y divide-[var(--color-line)]">
          {order.map((group, index) => (
            <li key={group.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-5 text-sm text-[var(--color-ink-subtle)] tabular-nums">
                {index + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-[var(--color-ink)]">
                {group.label}
              </span>
              <MoveButton
                label={`Move ${group.label} up`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
                arrow="up"
              />
              <MoveButton
                label={`Move ${group.label} down`}
                disabled={index === order.length - 1}
                onClick={() => move(index, 1)}
                arrow="down"
              />
            </li>
          ))}
        </ol>
      </Card>

      {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={saving}
          onClick={() =>
            save(
              order.map((group) => group.id),
              'Saved. Your menu now follows this order.',
            )
          }
        >
          {saving ? 'Saving…' : 'Save my order'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={saving}
          onClick={() => {
            setOrder(standard);
            save([], 'Back to the standard order.');
          }}
        >
          Use the standard order
        </Button>
      </div>
    </div>
  );
}

function MoveButton({
  label,
  disabled,
  onClick,
  arrow,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  arrow: 'up' | 'down';
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] border border-[var(--color-line)] text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-muted)] disabled:opacity-30"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path
          d={arrow === 'up' ? 'M2.5 7.5 6 4l3.5 3.5' : 'M2.5 4.5 6 8l3.5-3.5'}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
