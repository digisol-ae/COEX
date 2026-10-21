'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { IconButton } from '@/components/ui/icon-button';
import { formatMinutes } from '@coex/shared/time/week';

export interface PersonTime {
  userId: string;
  name: string;
  minutes: number;
  entries: { id: string; day: string; minutes: number; note: string | null; running: boolean }[];
}

/**
 * Time on one task or ticket, one line per person (John, 17 Oct 2026: a long list of entries under
 * every name was ugly). Each line shows the person and their total; the history icon opens that
 * person's entries, newest first, and closes them again. Shared by the task and the ticket page.
 */
export function TimeEntriesByPerson({
  people,
  alwaysExpanded = false,
}: {
  people: PersonTime[];
  alwaysExpanded?: boolean;
}) {
  const [open, setOpen] = useState<string[]>([]);

  function toggle(userId: string) {
    setOpen((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-line)]">
      {people.map((person) => {
        const expanded = alwaysExpanded || open.includes(person.userId);
        const Header = alwaysExpanded ? 'div' : 'button';

        return (
          <li key={person.userId} className="py-2">
            <div className="flex items-center gap-2">
              <Header
                {...(!alwaysExpanded
                  ? {
                      type: 'button' as const,
                      onClick: () => toggle(person.userId),
                      'aria-expanded': expanded,
                    }
                  : {})}
                className="flex min-w-0 flex-1 items-baseline gap-2 text-left"
              >
                <span className="truncate text-sm font-medium text-[var(--color-ink)]">
                  {person.name}
                </span>
                <span className="shrink-0 text-xs text-[var(--color-ink-subtle)]">
                  {person.entries.length} {person.entries.length === 1 ? 'entry' : 'entries'}
                </span>
                <span className="ml-auto shrink-0 text-sm font-medium text-[var(--color-ink)] tabular-nums">
                  {formatMinutes(person.minutes)}
                </span>
              </Header>

              {!alwaysExpanded ? (
                <IconButton
                  icon="history"
                  label={
                    expanded ? `Hide ${person.name}'s entries` : `Show ${person.name}'s entries`
                  }
                  onClick={() => toggle(person.userId)}
                  className={clsx(expanded && 'text-[var(--color-ink)]')}
                />
              ) : null}
            </div>

            {expanded ? (
              <ul className="mt-2 ml-1 divide-y divide-[var(--color-line)] border-l-2 border-[var(--color-line)] pl-3 text-xs text-[var(--color-ink-muted)]">
                {person.entries.map((entry) => (
                  <li key={entry.id} className="flex items-baseline gap-3 py-1">
                    <span className="w-24 shrink-0 tabular-nums">{entry.day}</span>
                    <span className="w-14 shrink-0 tabular-nums">
                      {entry.running ? 'running' : formatMinutes(entry.minutes)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{entry.note ?? ''}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
