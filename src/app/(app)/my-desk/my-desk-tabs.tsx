'use client';

import { useState, type ReactNode } from 'react';
import type { DeskHistoryItem } from '@/modules/tasks/services/desk.service';

export function MyDeskTabs({ today, history }: { today: ReactNode; history: DeskHistoryItem[] }) {
  const [tab, setTab] = useState<'today' | 'history'>('today');
  return (
    <>
      <div
        className="mb-5 flex gap-2 border-b border-[var(--color-line)]"
        role="tablist"
        aria-label="My Desk views"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'today'}
          onClick={() => setTab('today')}
          className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab === 'today' ? 'border-[var(--color-ink)] text-[var(--color-ink)]' : 'border-transparent text-[var(--color-ink-muted)]'}`}
        >
          Today&apos;s desk
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'history'}
          onClick={() => setTab('history')}
          className={`border-b-2 px-3 py-2 text-sm font-semibold ${tab === 'history' ? 'border-[var(--color-ink)] text-[var(--color-ink)]' : 'border-transparent text-[var(--color-ink-muted)]'}`}
        >
          Performance history
        </button>
      </div>
      {tab === 'today' ? today : <DeskHistory history={history} />}
    </>
  );
}

function DeskHistory({ history }: { history: DeskHistoryItem[] }) {
  if (!history.length)
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-line-strong)] p-6 text-sm text-[var(--color-ink-muted)]">
        No daily snapshot yet. On your desk, select your work and choose <b>I am done</b> to save
        the first one.
      </div>
    );
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-line)] px-4 py-3">
        <h2 className="font-semibold">Performance history</h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          A record of the work you placed on My Desk when you finished the day. The score will
          return after its algorithm is approved.
        </p>
      </div>
      <div className="divide-y divide-[var(--color-line)]">
        {history.map((item) => (
          <article key={item.id} className="p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <time className="font-semibold">{formatDate(item.workDate)}</time>
              <span className="text-sm text-[var(--color-ink-muted)]">
                {item.taskCount} task{item.taskCount === 1 ? '' : 's'} on desk
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
              <Metric label="On time" value={item.completedOnTime} />
              <Metric label="Overdue" value={item.overdue} />
              <Metric label="Tomorrow" value={item.dueTomorrowNotStarted} />
              <Metric label="Due soon" value={item.dueSoonInProgress} />
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-2 sm:block">
      <dt className="text-[var(--color-ink-muted)]">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}
