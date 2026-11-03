'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Input, Notice } from '@/components/ui';
import type { TicketPerson } from '@coex/shared/crm/ticket-people';
import { linkTicketPeopleAction, type LinkFromTicketsState } from '../actions';

const initialState: LinkFromTicketsState = {};

/**
 * Search everyone who has raised or been copied on a ticket and link them to this customer.
 *
 * With nothing typed it suggests people whose email domain matches the customer's.
 */
export function TicketPeoplePicker({
  organisationId,
  onClose,
}: {
  organisationId: string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<TicketPerson[]>([]);
  const [suggestions, setSuggestions] = useState(true);
  const [domains, setDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<Map<string, TicketPerson>>(new Map());
  const [refresh, setRefresh] = useState(0);
  // After a successful add, clear the ticks and reload so newly linked people show as added.
  const [state, formAction, pending] = useActionState(
    async (previous: LinkFromTicketsState, formData: FormData) => {
      const next = await linkTicketPeopleAction(previous, formData);
      if (next.message) {
        setSelected(new Map());
        setRefresh((value) => value + 1);
      }
      return next;
    },
    initialState,
  );
  const moveRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setLoadError('');
      fetch(
        `/api/crm/ticket-people?organisationId=${encodeURIComponent(organisationId)}&q=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      )
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? 'Search failed.');
          setPeople(data.people);
          setSuggestions(data.suggestions);
          setDomains(data.domains);
        })
        .catch((error) => {
          if (error.name !== 'AbortError') setLoadError(error.message || 'Search failed.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [organisationId, query, refresh]);

  const payload = useMemo(
    () =>
      JSON.stringify(
        [...selected.values()].map((person) => ({
          contactId: person.contactId,
          name: person.name,
          email: person.email,
          phone: person.phone,
        })),
      ),
    [selected],
  );

  function toggle(person: TicketPerson) {
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(person.key)) next.delete(person.key);
      else next.set(person.key, person);
      return next;
    });
  }

  function confirmMove() {
    if (moveRef.current) moveRef.current.value = 'yes';
    formRef.current?.requestSubmit();
  }

  const selectable = people.filter((person) => !person.linkedHere);
  const allTicked = selectable.length > 0 && selectable.every((p) => selected.has(p.key));

  return (
    <div className="mt-4 space-y-3 border-t border-[var(--color-line)] pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--color-ink)]">Find people from tickets</p>
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>

      <Input
        type="search"
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search name, email or phone"
        aria-label="Search people on tickets"
      />

      <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-ink-subtle)]">
        <span>
          {loading
            ? 'Searching…'
            : suggestions
              ? domains.length
                ? `Suggested: people from @${domains.join(', @')}`
                : 'Type at least 2 characters to search.'
              : `${people.length} ${people.length === 1 ? 'person' : 'people'} found`}
        </span>
        {selectable.length > 1 ? (
          <button
            type="button"
            className="font-medium text-[var(--color-ink-muted)] hover:underline"
            onClick={() =>
              setSelected((current) => {
                const next = new Map(current);
                for (const person of selectable) {
                  if (allTicked) next.delete(person.key);
                  else next.set(person.key, person);
                }
                return next;
              })
            }
          >
            {allTicked ? 'Clear all' : 'Select all'}
          </button>
        ) : null}
      </div>

      {loadError ? <Notice tone="alert">{loadError}</Notice> : null}

      {!loading && !loadError && people.length === 0 && !(suggestions && !domains.length) ? (
        <p className="text-sm text-[var(--color-ink-muted)]">
          {suggestions ? 'No one on tickets shares this customer’s email domain.' : 'No one found.'}
        </p>
      ) : null}

      {people.length ? (
        <ul className="max-h-80 divide-y divide-[var(--color-line)] overflow-y-auto rounded-md border border-[var(--color-line)]">
          {people.map((person) => {
            const ticked = selected.has(person.key);
            return (
              <li key={person.key}>
                <label
                  className={`flex cursor-pointer items-start gap-3 px-3 py-2 ${
                    person.linkedHere
                      ? 'cursor-default opacity-50'
                      : 'hover:bg-[var(--color-surface-sunken)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={person.linkedHere || ticked}
                    disabled={person.linkedHere}
                    onChange={() => toggle(person)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-[var(--color-ink)]">
                        {person.name}
                      </span>
                      {person.linkedHere ? <Badge tone="ok">Already a contact</Badge> : null}
                      {!person.linkedHere && person.organisationName ? (
                        <Badge tone="warn">At {person.organisationName}</Badge>
                      ) : null}
                      {person.domainMatch && !person.linkedHere ? (
                        <Badge tone="info">Same domain</Badge>
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-[var(--color-ink-muted)]">
                      {[person.email, person.phone].filter(Boolean).join(' · ')}
                    </span>
                    <span className="block text-xs text-[var(--color-ink-subtle)]">
                      {person.tickets} ticket{person.tickets === 1 ? '' : 's'}
                      {person.ccOnly ? ' (copied)' : ''}
                      {person.lastTicketAt
                        ? ` · last ${new Date(person.lastTicketAt).toLocaleDateString()}`
                        : ''}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : null}

      <form ref={formRef} action={formAction} className="space-y-2">
        <input type="hidden" name="organisationId" value={organisationId} />
        <input type="hidden" name="people" value={payload} />
        <input ref={moveRef} type="hidden" name="move" defaultValue="no" />

        {state.conflicts?.length ? (
          <Notice tone="warn">
            <span className="block">
              {state.conflicts.length === 1 ? 'This person is' : 'These people are'} already a
              contact of another customer:
            </span>
            <ul className="my-1 list-disc pl-5">
              {state.conflicts.map((c) => (
                <li key={`${c.name}-${c.organisationName}`}>
                  {c.name} at {c.organisationName}
                </li>
              ))}
            </ul>
            <span className="block">
              Move them here? Their tickets already filed under the other customer stay there.
            </span>
            <span className="mt-2 flex gap-2">
              <Button type="button" disabled={pending} onClick={confirmMove}>
                Move and add
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSelected((current) => {
                    const next = new Map(current);
                    for (const person of current.values()) {
                      if (person.organisationName) next.delete(person.key);
                    }
                    return next;
                  });
                }}
              >
                Untick them
              </Button>
            </span>
          </Notice>
        ) : null}
        {state.error ? <Notice tone="alert">{state.error}</Notice> : null}
        {state.message ? <Notice tone="ok">{state.message}</Notice> : null}

        <Button
          type={selected.size ? 'submit' : 'button'}
          disabled={pending || selected.size === 0}
          onClick={() => {
            if (moveRef.current) moveRef.current.value = 'no';
          }}
        >
          {pending
            ? 'Adding'
            : selected.size
              ? `Add ${selected.size} as contact${selected.size === 1 ? '' : 's'}`
              : 'Tick people to add'}
        </Button>
      </form>
    </div>
  );
}
