'use client';

import type { ReactNode } from 'react';
import { MenuItem, Popover } from './inline-edit';

/**
 * A menu of choices where any number can be ticked, in the same style as the assignee picker.
 * Choosing nothing means "all", which is what every list filter wants, so the first entry says so
 * and clears the selection.
 */
export function OptionMultiPicker({
  label,
  allLabel,
  noun,
  options,
  selectedIds,
  onChange,
}: {
  label: string;
  allLabel: string;
  noun: string;
  options: { id: string; name: string; icon?: ReactNode }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const chosen = options.filter((option) => selectedIds.includes(option.id));
  const summary =
    chosen.length === 0
      ? allLabel
      : chosen.length === 1
        ? chosen[0].name
        : `${chosen.length} ${noun}`;

  return (
    <Popover
      label={label}
      trigger={
        <span className="flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-[var(--color-line-strong)] px-3 text-sm text-[var(--color-ink)]">
          <span className="max-w-40 truncate">{summary}</span>
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="m3 4.5 3 3 3-3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      }
    >
      {() => (
        <div className="max-h-72 w-56 overflow-y-auto">
          <MenuItem selected={selectedIds.length === 0} onClick={() => onChange([])}>
            <span className="flex-1 truncate">{allLabel}</span>
            {selectedIds.length === 0 ? <Tick /> : null}
          </MenuItem>
          {options.map((option) => {
            const isOn = selectedIds.includes(option.id);
            return (
              <MenuItem
                key={option.id}
                selected={isOn}
                onClick={() =>
                  onChange(
                    isOn
                      ? selectedIds.filter((id) => id !== option.id)
                      : [...selectedIds, option.id],
                  )
                }
              >
                {option.icon}
                <span className="flex-1 truncate">{option.name}</span>
                {isOn ? <Tick /> : null}
              </MenuItem>
            );
          })}
        </div>
      )}
    </Popover>
  );
}

function Tick() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="m2.5 6.2 2.3 2.3 4.7-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
