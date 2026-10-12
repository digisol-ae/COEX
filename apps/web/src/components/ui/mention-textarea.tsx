'use client';

import { useEffect, useRef, useState, type ComponentProps, type KeyboardEvent } from 'react';
import { clsx } from 'clsx';

export interface MentionPerson {
  id: string;
  name: string;
}

const MATCH_LIMIT = 6;

/**
 * A textarea that offers colleagues' names after "@".
 *
 * Picking a name writes "@Full Name" into the text and adds that person to a hidden mentionIds
 * field. The server only alerts people whose "@Full Name" is still in the text when it is posted,
 * so deleting a mention cancels it. With no people passed it is a plain textarea, which is how a
 * reply to a customer stays free of mentions.
 */
export function MentionTextarea({
  people,
  ref,
  className,
  onKeyDown,
  ...props
}: ComponentProps<'textarea'> & { people: MentionPerson[] }) {
  const inner = useRef<HTMLTextAreaElement | null>(null);
  const [text, setText] = useState('');
  const [chosen, setChosen] = useState<MentionPerson[]>([]);
  const [query, setQuery] = useState<{ at: number; term: string } | null>(null);
  const [highlight, setHighlight] = useState(0);

  const matches =
    query && people.length > 0
      ? people.filter((person) => startsAWord(person.name, query.term)).slice(0, MATCH_LIMIT)
      : [];
  const open = matches.length > 0;

  // A posted form resets the textarea without an input event, so forget the old mentions with it.
  useEffect(() => {
    const form = inner.current?.form;
    if (!form) return;
    const forget = () => {
      setText('');
      setChosen([]);
      setQuery(null);
    };
    form.addEventListener('reset', forget);
    return () => form.removeEventListener('reset', forget);
  }, []);

  function attach(element: HTMLTextAreaElement | null) {
    inner.current = element;
    if (typeof ref === 'function') ref(element);
    else if (ref) ref.current = element;
  }

  function track(element: HTMLTextAreaElement) {
    setText(element.value);
    const before = element.value.slice(0, element.selectionStart ?? element.value.length);
    const found = /(?:^|\s)@([^\s@][^@\n]{0,40})?$/.exec(before);
    if (!found) {
      setQuery(null);
      return;
    }
    setQuery({ at: before.lastIndexOf('@'), term: found[1] ?? '' });
    setHighlight(0);
  }

  function pick(person: MentionPerson) {
    const element = inner.current;
    if (!element || !query) return;
    const caret = element.selectionStart ?? element.value.length;
    const inserted = `@${person.name} `;
    element.value = element.value.slice(0, query.at) + inserted + element.value.slice(caret);
    const position = query.at + inserted.length;
    element.setSelectionRange(position, position);
    element.focus();
    setText(element.value);
    setChosen((current) =>
      current.some((existing) => existing.id === person.id) ? current : [...current, person],
    );
    setQuery(null);
  }

  function handleKeys(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        setHighlight((current) => (current + step + matches.length) % matches.length);
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        pick(matches[Math.min(highlight, matches.length - 1)]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setQuery(null);
        return;
      }
    }
    onKeyDown?.(event);
  }

  const stillMentioned = chosen.filter((person) => text.includes(`@${person.name}`));

  return (
    <div className="relative">
      <textarea
        {...props}
        ref={attach}
        className={className}
        onInput={(event) => track(event.currentTarget)}
        onKeyDown={handleKeys}
        onBlur={() => setTimeout(() => setQuery(null), 150)}
        aria-autocomplete={people.length > 0 ? 'list' : undefined}
        aria-expanded={people.length > 0 ? open : undefined}
      />

      {stillMentioned.map((person) => (
        <input key={person.id} type="hidden" name="mentionIds" value={person.id} />
      ))}

      {open ? (
        <ul
          role="listbox"
          aria-label="People to mention"
          className="absolute top-full left-0 z-30 mt-1 w-64 max-w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-pop)]"
        >
          {matches.map((person, index) => (
            <li key={person.id} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                // Picking on mouse down keeps the textarea focused, so the caret position survives.
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(person);
                }}
                className={clsx(
                  'block w-full truncate px-3 py-1.5 text-left text-sm',
                  index === highlight
                    ? 'bg-[var(--color-surface-muted)] text-[var(--color-ink)]'
                    : 'text-[var(--color-ink-muted)]',
                )}
              >
                {person.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** "fa" finds Fatima Noor and "no" finds her too, because people remember either name. */
function startsAWord(name: string, term: string): boolean {
  const wanted = term.trim().toLowerCase();
  if (!wanted) return true;
  const lower = name.toLowerCase();
  return lower.startsWith(wanted) || lower.split(/\s+/).some((word) => word.startsWith(wanted));
}
