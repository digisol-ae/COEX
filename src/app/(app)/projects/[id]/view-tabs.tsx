'use client';

import { clsx } from 'clsx';
import type { ProjectView } from './board';

/**
 * View tabs, the way every tool people already use presents them: one row, always visible, showing
 * what else this project can be looked at as. A dropdown would hide the fact that a Gantt exists.
 */

const VIEWS: { id: ProjectView; label: string; icon: 'board' | 'list' | 'gantt' }[] = [
  { id: 'list', label: 'List', icon: 'list' },
  { id: 'board', label: 'Board', icon: 'board' },
  { id: 'gantt', label: 'Gantt', icon: 'gantt' },
];

export function ViewTabs({
  view,
  onChange,
}: {
  view: ProjectView;
  onChange: (view: ProjectView) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 border-b border-[var(--color-line)]">
      {VIEWS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          aria-current={view === option.id ? 'page' : undefined}
          className={clsx(
            '-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] transition-colors',
            view === option.id
              ? 'border-[var(--color-ink)] font-medium text-[var(--color-ink)]'
              : 'border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
          )}
        >
          <ViewIcon name={option.icon} />
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ViewIcon({ name }: { name: 'board' | 'list' | 'gantt' }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 14 14',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'list') {
    return (
      <svg {...common}>
        <path d="M2 3.5h10M2 7h10M2 10.5h10" />
      </svg>
    );
  }

  if (name === 'board') {
    return (
      <svg {...common}>
        <rect x="1.75" y="2.25" width="3.5" height="9.5" rx="1" />
        <rect x="8.75" y="2.25" width="3.5" height="6" rx="1" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M2 3.5h6M4 7h7M2 10.5h5" />
    </svg>
  );
}
