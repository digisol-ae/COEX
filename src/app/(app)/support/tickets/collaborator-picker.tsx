'use client';

import { useState } from 'react';
import { Input, Notice } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';
import { normaliseCc, type CollaboratorOption } from '@/modules/tickets/collaborators';

export function CollaboratorPicker({
  options,
  initialEmails = [],
  disabled = false,
}: {
  options: CollaboratorOption[];
  initialEmails?: string[];
  disabled?: boolean;
}) {
  const [emails, setEmails] = useState(initialEmails);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  function add(email: string) {
    try {
      setEmails(normaliseCc([...emails, email]));
      setSearch('');
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Enter a valid email.');
    }
  }
  const matches = search.trim()
    ? options
        .filter(
          (option) =>
            !emails.includes(option.email.toLowerCase()) &&
            `${option.name} ${option.email} ${option.source}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .slice(0, 12)
    : [];
  return (
    <fieldset
      className="space-y-2 rounded-[var(--radius-control)] border border-[var(--color-line)] p-3"
      disabled={disabled}
    >
      <legend className="px-1 text-xs font-medium">CC collaborators</legend>
      <p className="text-[11px] text-[var(--color-ink-subtle)]">
        Search team, customer or branch contacts, or enter an email. Public replies include these
        addresses in CC. Internal notes stay private.
      </p>
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search collaborators or enter email"
          placeholder="Name or email address"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add(search);
            }
          }}
        />
        <IconButton icon="add" label="Add CC email" onClick={() => add(search)} />
      </div>
      {matches.length ? (
        <ul className="max-h-40 overflow-y-auto">
          {matches.map((option, index) => (
            <li key={`${option.email}-${index}`}>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-xs text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)]"
                onClick={() => add(option.email)}
              >
                {option.name} · {option.source}
                <span className="block text-[var(--color-ink-subtle)]">{option.email}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-1">
        {emails.map((email) => (
          <span
            key={email}
            className="flex max-w-full items-center gap-1 rounded border border-[var(--color-line)] px-2 py-1 text-xs text-[var(--color-ink)]"
          >
            <input type="hidden" name="ccEmails" value={email} />
            <span className="truncate">{email}</span>
            <IconButton
              icon="remove"
              label={`Remove CC ${email}`}
              onClick={() => setEmails(emails.filter((value) => value !== email))}
            />
          </span>
        ))}
      </div>
      {error ? <Notice tone="alert">{error}</Notice> : null}
    </fieldset>
  );
}
