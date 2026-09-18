'use client';

import { useState, useTransition } from 'react';
import { clsx } from 'clsx';
import { Avatar } from '@/components/ui/avatar';
import { quickAddFolderAction } from '../../tasks/actions';
import type { FolderChoice } from './board';

/**
 * The folders in a space, as a strip above the views.
 *
 * Folders are the second of four levels and the only place visibility is decided, so they sit in
 * plain sight rather than behind a settings screen. A private folder carries a lock and the faces
 * of the people who can open it: the question "who can see this" should be answerable by looking,
 * not by opening a dialog.
 */
export function FolderBar({
  spaceId,
  folders,
  activeFolderId,
  onSelect,
  canManage,
  counts,
}: {
  spaceId: string;
  folders: FolderChoice[];
  activeFolderId: string | null;
  onSelect: (folderId: string | null) => void;
  canManage: boolean;
  counts: Record<string, number>;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const active = folders.find((folder) => folder.id === activeFolderId) ?? null;

  return (
    <div className="border-b border-[var(--color-line)] pb-2">
      <div className="flex flex-wrap items-center gap-1">
        <Tab
          label="All work"
          count={counts.all ?? 0}
          on={!activeFolderId}
          onClick={() => onSelect(null)}
        />

        {folders.map((folder) => (
          <Tab
            key={folder.id}
            label={folder.name}
            count={counts[folder.id] ?? 0}
            on={activeFolderId === folder.id}
            isPrivate={folder.isPrivate}
            onClick={() => onSelect(folder.id)}
          />
        ))}

        {canManage && !adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            aria-label="Add a folder to this space"
            title="Add a folder"
            className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-control)] text-[var(--color-ink-subtle)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="M6 2.5v7M2.5 6h7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        ) : null}

        {adding ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();

              const value = name.trim();
              if (!value) return;

              setName('');
              setAdding(false);
              setError(null);

              startTransition(async () => {
                const result = await quickAddFolderAction({ spaceId, name: value });
                if (result.error) setError(result.error);
              });
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => {
                if (!name.trim()) setAdding(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setName('');
                  setAdding(false);
                }
              }}
              placeholder="Folder name"
              aria-label="New folder name"
              className="w-36 rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2 py-1 text-[12px] text-[var(--color-ink)] focus:outline-none"
            />
          </form>
        ) : null}
      </div>

      {error ? <p className="mt-1 text-[11px] text-[var(--color-status-alert)]">{error}</p> : null}

      {active?.isPrivate ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--color-ink-muted)]">
          <Lock />
          Private to
          <span className="flex -space-x-1.5">
            {active.memberNames.map((memberName) => (
              <Avatar key={memberName} name={memberName} size="small" />
            ))}
          </span>
          {active.memberNames.join(', ')}
        </p>
      ) : null}
    </div>
  );
}

function Tab({
  label,
  count,
  on,
  isPrivate,
  onClick,
}: {
  label: string;
  count: number;
  on: boolean;
  isPrivate?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={clsx(
        'flex items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 py-1 text-[12px] transition-colors',
        on
          ? 'bg-[var(--color-surface-muted)] font-medium text-[var(--color-ink)]'
          : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
      )}
    >
      {isPrivate ? <Lock /> : null}
      {label}
      <span className="text-[var(--color-ink-subtle)] tabular-nums">{count}</span>
    </button>
  );
}

function Lock() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="2.5" y="5.5" width="7" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4.2 5.5V4a1.8 1.8 0 0 1 3.6 0v1.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
