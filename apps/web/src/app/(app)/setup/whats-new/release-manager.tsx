'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import type { ReleaseNote } from '@/modules/core/release-notes';
import type {
  ReleaseCommand,
  ReleaseContentState,
  ReleaseEntry,
} from '@/modules/core/release-content';
import { groupReleaseTopicsByDate } from '@/modules/core/release-groups';
import { changeReleaseContentAction } from './actions';

const field =
  'w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)]';
const small =
  'rounded-md border border-[var(--color-line)] px-2 py-1 text-xs text-[var(--color-ink)] hover:bg-[var(--color-surface-muted)] disabled:opacity-40';
function moved<T>(items: T[], index: number, direction: number) {
  const result = [...items];
  [result[index], result[index + direction]] = [result[index + direction], result[index]];
  return result;
}

export function ReleaseManager({ initial }: { initial: ReleaseContentState }) {
  const [state, setState] = useState(initial);
  const [creating, setCreating] = useState<ReleaseNote | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function run(command: ReleaseCommand) {
    setError('');
    setMessage('');
    startTransition(async () => {
      try {
        const result = await changeReleaseContentAction(state.version, command);
        if (result.error || !result.state) {
          setError(result.error ?? 'Could not save content.');
          return;
        }
        setState(result.state);
        if (command.kind === 'save') setCreating(null);
        setMessage(
          command.kind === 'save'
            ? 'Draft saved. Publish when it is ready.'
            : command.kind === 'publish'
              ? 'Topic published to your workspace.'
              : 'Content updated.',
        );
        router.refresh();
      } catch {
        setError('Could not connect. Your edits are still here; try again.');
      }
    });
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-ink-muted)]">
          {state.entries.length} topics · Grouped by release date
        </p>
        <Button
          type="button"
          disabled={pending || !!creating}
          onClick={() =>
            setCreating({
              id: crypto.randomUUID(),
              title: '',
              date: new Intl.DateTimeFormat('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(new Date()),
              sections: [{ heading: '', items: [''] }],
            })
          }
        >
          Add topic
        </Button>
      </div>
      <p className="text-sm text-[var(--color-ink-muted)]">
        Draft edits stay private until published. Updates with the same release date appear
        together. Move topics up or down within their date.
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-[var(--color-ink)]">
          {message}
        </p>
      )}
      <fieldset disabled={pending} className="min-w-0 disabled:opacity-60">
        {creating && (
          <div className="border-b border-[var(--color-line)] py-4">
            <h3 className="mb-3 font-semibold">New topic</h3>
            <Editor
              draft={creating}
              onSave={(draft) => run({ kind: 'save', draft })}
              onCancel={() => setCreating(null)}
            />
          </div>
        )}
        {groupReleaseTopicsByDate(state.entries, (entry) => entry.draft.date).map(
          (day, dayIndex) => (
            <details
              key={day.date}
              open={dayIndex === 0}
              className="group/day border-b border-[var(--color-line)] last:border-0"
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 py-4 text-[var(--color-ink)] [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true" className="transition-transform group-open/day:rotate-90">
                  ›
                </span>
                <span className="font-semibold">{day.date}</span>
                <span className="text-xs text-[var(--color-ink-muted)]">
                  {day.topics.length} {day.topics.length === 1 ? 'topic' : 'topics'}
                </span>
              </summary>
              <div className="pb-3 pl-4">
                {day.topics.map((entry, index) => (
                  <Topic
                    key={entry.draft.id}
                    entry={entry}
                    index={index}
                    total={day.topics.length}
                    run={run}
                  />
                ))}
              </div>
            </details>
          ),
        )}
        {!state.entries.length && (
          <p className="p-6 text-sm text-[var(--color-ink-muted)]">
            No topics yet. Add a topic to prepare your first update.
          </p>
        )}
      </fieldset>
      {pending && (
        <p role="status" className="text-sm">
          Saving…
        </p>
      )}
    </div>
  );
}

function Topic({
  entry,
  index,
  total,
  run,
}: {
  entry: ReleaseEntry;
  index: number;
  total: number;
  run: (command: ReleaseCommand) => void;
}) {
  const [editing, setEditing] = useState(false);
  const hasDraft =
    entry.published && JSON.stringify(entry.draft) !== JSON.stringify(entry.published);
  return (
    <details className="group/topic">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 py-3 text-[var(--color-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="transition-transform group-open/topic:rotate-90">
          ›
        </span>
        <span className="font-semibold">{entry.draft.title}</span>
        <span className="ml-3 text-xs text-[var(--color-ink-muted)]">
          {entry.published ? (hasDraft ? 'Published · Draft changes' : 'Published') : 'Draft'}
        </span>
      </summary>
      <div className="space-y-4 pb-5 pl-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={small}
            disabled={index === 0 || editing}
            aria-label={`Move ${entry.draft.title} up`}
            onClick={() => run({ kind: 'move', id: entry.draft.id, direction: 'up' })}
          >
            ↑ Move up
          </button>
          <button
            type="button"
            className={small}
            disabled={index === total - 1 || editing}
            aria-label={`Move ${entry.draft.title} down`}
            onClick={() => run({ kind: 'move', id: entry.draft.id, direction: 'down' })}
          >
            ↓ Move down
          </button>
          {!editing && (
            <button type="button" className={small} onClick={() => setEditing(true)}>
              Edit content
            </button>
          )}
          {!editing && (
            <>
              {(!entry.published || hasDraft) && (
                <button
                  type="button"
                  className={small}
                  onClick={() => run({ kind: 'publish', id: entry.draft.id })}
                >
                  {entry.published ? 'Publish changes' : 'Publish'}
                </button>
              )}
              {entry.published && (
                <button
                  type="button"
                  className={small}
                  onClick={() => {
                    if (
                      window.confirm('Unpublish this topic? It will be hidden from your workspace.')
                    )
                      run({ kind: 'unpublish', id: entry.draft.id });
                  }}
                >
                  Unpublish
                </button>
              )}
              <button
                type="button"
                className={small}
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete “${entry.draft.title}”? This removes its draft and published content.`,
                    )
                  )
                    run({ kind: 'delete', id: entry.draft.id });
                }}
              >
                Delete
              </button>
            </>
          )}
        </div>
        {editing ? (
          <Editor
            key={JSON.stringify(entry.draft)}
            draft={entry.draft}
            onSave={(draft) => run({ kind: 'save', draft })}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <Preview draft={entry.draft} />
        )}
      </div>
    </details>
  );
}

function Preview({ draft }: { draft: ReleaseNote }) {
  return (
    <div className="space-y-3">
      {draft.sections.map((section, index) => (
        <details key={index} open className="py-1">
          <summary className="cursor-pointer text-sm font-semibold text-[var(--color-ink)]">
            {section.heading}
          </summary>
          <div className="mt-2 space-y-2">
            {section.items.map((item, i) => (
              <p
                key={i}
                className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-ink-muted)]"
              >
                {item}
              </p>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function Editor({
  draft,
  onSave,
  onCancel,
}: {
  draft: ReleaseNote;
  onSave: (draft: ReleaseNote) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(() => structuredClone(draft));
  const [preview, setPreview] = useState(false);
  function sections(next: ReleaseNote['sections']) {
    setValue({ ...value, sections: next });
  }
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(value);
      }}
    >
      <label className="block text-sm font-medium">
        Main topic
        <input
          required
          maxLength={200}
          className={`${field} mt-1`}
          value={value.title}
          onChange={(event) => setValue({ ...value, title: event.target.value })}
        />
      </label>
      <label className="block text-sm font-medium">
        Release date
        <input
          required
          maxLength={60}
          className={`${field} mt-1`}
          value={value.date}
          onChange={(event) => setValue({ ...value, date: event.target.value })}
        />
      </label>
      {value.sections.map((section, index) => (
        <div key={index} className="space-y-3 rounded-lg border border-[var(--color-line)] p-3">
          <label className="block text-sm font-medium">
            Section heading
            <input
              required
              maxLength={200}
              className={`${field} mt-1`}
              value={section.heading}
              onChange={(event) =>
                sections(
                  value.sections.map((s, i) =>
                    i === index ? { ...s, heading: event.target.value } : s,
                  ),
                )
              }
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={small}
              disabled={index === 0}
              aria-label={`Move section ${index + 1} up`}
              onClick={() => sections(moved(value.sections, index, -1))}
            >
              ↑ Section
            </button>
            <button
              type="button"
              className={small}
              disabled={index === value.sections.length - 1}
              aria-label={`Move section ${index + 1} down`}
              onClick={() => sections(moved(value.sections, index, 1))}
            >
              ↓ Section
            </button>
            <button
              type="button"
              className={small}
              disabled={value.sections.length === 1}
              onClick={() => sections(value.sections.filter((_, i) => i !== index))}
            >
              Remove section
            </button>
          </div>
          {section.items.map((item, paragraph) => (
            <div key={paragraph} className="space-y-1">
              <label className="block text-sm">
                Paragraph {paragraph + 1}
                <textarea
                  required
                  maxLength={5000}
                  rows={3}
                  className={`${field} mt-1`}
                  value={item}
                  onChange={(event) =>
                    sections(
                      value.sections.map((s, i) =>
                        i === index
                          ? {
                              ...s,
                              items: s.items.map((p, j) =>
                                j === paragraph ? event.target.value : p,
                              ),
                            }
                          : s,
                      ),
                    )
                  }
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={small}
                  disabled={paragraph === 0}
                  aria-label={`Move paragraph ${paragraph + 1} up in section ${index + 1}`}
                  onClick={() =>
                    sections(
                      value.sections.map((s, i) =>
                        i === index ? { ...s, items: moved(s.items, paragraph, -1) } : s,
                      ),
                    )
                  }
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={small}
                  disabled={paragraph === section.items.length - 1}
                  aria-label={`Move paragraph ${paragraph + 1} down in section ${index + 1}`}
                  onClick={() =>
                    sections(
                      value.sections.map((s, i) =>
                        i === index ? { ...s, items: moved(s.items, paragraph, 1) } : s,
                      ),
                    )
                  }
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={small}
                  disabled={section.items.length === 1}
                  onClick={() =>
                    sections(
                      value.sections.map((s, i) =>
                        i === index
                          ? { ...s, items: s.items.filter((_, j) => j !== paragraph) }
                          : s,
                      ),
                    )
                  }
                >
                  Remove paragraph
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className={small}
            disabled={section.items.length >= 50}
            onClick={() =>
              sections(
                value.sections.map((s, i) => (i === index ? { ...s, items: [...s.items, ''] } : s)),
              )
            }
          >
            Add paragraph
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={small}
          disabled={value.sections.length >= 30}
          onClick={() => sections([...value.sections, { heading: '', items: [''] }])}
        >
          Add section
        </button>
        <button type="button" className={small} onClick={() => setPreview(!preview)}>
          {preview ? 'Hide preview' : 'Preview'}
        </button>
        <Button type="submit">Save draft</Button>
        <button
          type="button"
          className={small}
          onClick={() => {
            if (
              JSON.stringify(value) === JSON.stringify(draft) ||
              window.confirm('Discard unsaved edits?')
            )
              onCancel();
          }}
        >
          Cancel
        </button>
      </div>
      {preview && (
        <div className="border-b border-[var(--color-line)] py-4">
          <h3 className="font-semibold">{value.title}</h3>
          <p className="mb-3 text-xs text-[var(--color-ink-muted)]">{value.date} · Preview</p>
          <Preview draft={value} />
        </div>
      )}
    </form>
  );
}
