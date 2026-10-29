'use client';

import { useEffect, useState, useSyncExternalStore, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { groupReleaseTopicsByDate } from '@/modules/core/release-groups';
import type { ReleaseNote } from '@/modules/core/release-notes';
import { acknowledgeReleaseNotesAction } from '@/app/(app)/preferences/actions';

/* Whether the drawer is showing, shared with the avatar menu's "What's new". */
const listeners = new Set<() => void>();
let openedByHand = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const listener of listeners) listener();
}

/** Opens the drawer, from the avatar menu. */
export function openWhatsNew(): void {
  openedByHand = true;
  notify();
}

function dismiss() {
  openedByHand = false;
  notify();
}

export function WhatsNew({
  seen,
  releases,
  latestId,
}: {
  seen: string | null;
  releases: ReleaseNote[];
  latestId: string | null;
}) {
  const router = useRouter();
  const unseen = Boolean(latestId && seen !== latestId);
  function close() {
    dismiss();
  }
  const open = useSyncExternalStore(
    subscribe,
    () => openedByHand,
    () => false,
  );
  const [understood, setUnderstood] = useState(false);
  const [saving, startTransition] = useTransition();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, latestId]);

  if (!open) return null;

  function done() {
    if (unseen && understood && latestId) {
      setError('');
      startTransition(async () => {
        try {
          const result = await acknowledgeReleaseNotesAction(latestId);
          if (result.error) {
            setError(result.error);
            router.refresh();
            return;
          }
        } catch {
          setError('Could not save. Please try again.');
          return;
        }
        close();
        // The avatar's dot goes once the account knows.
        router.refresh();
      });
    } else {
      close();
    }
  }

  return createPortal(
    <div className="popup-backdrop-light fixed inset-0 z-50 flex justify-end" onMouseDown={close}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="popup-glass-gradient whats-new-drawer flex h-full w-full max-w-md flex-col !rounded-none sm:!rounded-l-[1.25rem]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-6 pt-6 pb-4">
          <div>
            <h2 id="whats-new-title" className="text-xl font-bold text-[var(--color-ink)]">
              What&apos;s new
            </h2>
            <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
              Everything that changed in Worktello, newest first.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-subtle)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          {groupReleaseTopicsByDate(releases, (release) => release.date).map((day, dayIndex) => (
            <details
              key={day.date}
              open={dayIndex === 0}
              className="group/day border-b border-[var(--color-line)] last:border-0"
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 py-4 text-[var(--color-ink)] [&::-webkit-details-marker]:hidden">
                <span
                  aria-hidden="true"
                  className="text-base transition-transform group-open/day:rotate-90"
                >
                  ›
                </span>
                <span className="text-sm font-semibold">{day.date}</span>
                <span className="text-xs text-[var(--color-ink-subtle)]">
                  {day.topics.length} {day.topics.length === 1 ? 'topic' : 'topics'}
                </span>
                {dayIndex === 0 && unseen && (
                  <span className="rounded-full bg-[var(--color-brand-red)] px-2 py-0.5 text-[10px] font-semibold text-white">
                    New
                  </span>
                )}
              </summary>
              <div className="pb-3 pl-4">
                {day.topics.map((release) => (
                  <details key={release.id} className="group/topic">
                    <summary className="flex cursor-pointer list-none items-start gap-2 py-2 text-sm font-semibold leading-relaxed text-[var(--color-ink)] [&::-webkit-details-marker]:hidden">
                      <span
                        aria-hidden="true"
                        className="shrink-0 transition-transform group-open/topic:rotate-90"
                      >
                        ›
                      </span>
                      <span>{release.title}</span>
                    </summary>
                    <div className="space-y-3 pb-4 pl-4 pt-1">
                      {release.sections.map((section, sectionIndex) => (
                        <section key={sectionIndex}>
                          <h4 className="text-sm font-semibold text-[var(--color-ink)]">
                            {section.heading}
                          </h4>
                          <div className="mt-1 space-y-2">
                            {section.items.map((item, itemIndex) => (
                              <p
                                key={itemIndex}
                                className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-ink-muted)]"
                              >
                                {item}
                              </p>
                            ))}
                          </div>
                        </section>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ))}
        </div>

        {!releases.length && (
          <p className="px-6 text-sm text-[var(--color-ink-muted)]">No published updates yet.</p>
        )}
        <footer className="border-t border-[var(--color-line)] px-6 py-4">
          {unseen ? (
            <label className="mb-3 flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={understood}
                onChange={(event) => setUnderstood(event.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                <span className="font-medium text-[var(--color-ink)]">
                  I understand what&apos;s new
                </span>
                <span className="block text-xs text-[var(--color-ink-subtle)]">
                  Then this will not open by itself again until the next update. It is always in
                  your menu under What&apos;s new.
                </span>
              </span>
            </label>
          ) : (
            <p className="mb-3 text-xs text-[var(--color-ink-subtle)]">
              You are up to date. This opens by itself again when something new arrives.
            </p>
          )}
          {error && (
            <p role="alert" className="mb-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <Button type="button" className="w-full" disabled={saving} onClick={done}>
            {saving ? 'Saving' : unseen && understood ? 'Done' : 'Close'}
          </Button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
