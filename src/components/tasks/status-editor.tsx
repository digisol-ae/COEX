'use client';
import { useState } from 'react';
import { Input } from '@/components/ui';
import type { SpaceStatus } from '@/modules/tasks/statuses';

export function StatusEditor({ initial }: { initial: SpaceStatus[] }) {
  const [statuses, setStatuses] = useState(initial);
  function update(index: number, patch: Partial<SpaceStatus>) {
    setStatuses((current) =>
      current.map((status, i) => (i === index ? { ...status, ...patch } : status)),
    );
  }
  function move(index: number, direction: number) {
    const next = [...statuses];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setStatuses(next);
  }
  return (
    <fieldset className="space-y-2 border-t border-[var(--color-line)] pt-4">
      <legend className="text-sm font-semibold">Task statuses</legend>
      <p className="text-xs text-[var(--color-ink-muted)]">
        Shared by all views in this Space. Move tasks out of a status before renaming or removing
        it. Choose one completed status.
      </p>
      <input type="hidden" name="statuses" value={JSON.stringify(statuses)} />
      {statuses.map((status, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={status.name}
            maxLength={80}
            required
            aria-label={'Status ' + (index + 1)}
            onChange={(event) => update(index, { name: event.target.value })}
          />
          <label className="flex shrink-0 items-center gap-1 text-xs">
            <input
              type="radio"
              name="completedStatus"
              checked={status.isClosed}
              onChange={() =>
                setStatuses((current) =>
                  current.map((value, i) => ({ ...value, isClosed: i === index })),
                )
              }
            />
            Done
          </label>
          <button
            type="button"
            aria-label={'Move ' + status.name + ' up'}
            disabled={index === 0}
            onClick={() => move(index, -1)}
            className="px-1 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            aria-label={'Move ' + status.name + ' down'}
            disabled={index === statuses.length - 1}
            onClick={() => move(index, 1)}
            className="px-1 disabled:opacity-30"
          >
            ↓
          </button>
          <button
            type="button"
            aria-label={'Remove ' + status.name}
            disabled={statuses.length <= 2 || status.isClosed}
            onClick={() => setStatuses((current) => current.filter((_, i) => i !== index))}
            className="px-1 disabled:opacity-30"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={statuses.length >= 20}
        className="text-sm underline disabled:opacity-30"
        onClick={() => setStatuses((current) => [...current, { name: '', isClosed: false }])}
      >
        Add status
      </button>
    </fieldset>
  );
}
