'use client';

import { useEffect, useState, useSyncExternalStore, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { LATEST_RELEASE_ID, RELEASE_NOTES } from '@/modules/core/release-notes';
import { acknowledgeReleaseNotesAction } from '@/app/(app)/preferences/actions';

/*
 * Whether the drawer is showing, shared with the avatar menu's "What's new". It opens by itself
 * once per sign-in while the newest release is not yet acknowledged; closing it without ticking
 * "I understand" keeps it closed for the rest of this sign-in, and it opens again at the next.
 */
const DISMISSED_KEY = 'coex.whatsNew.dismissed';
const listeners = new Set<() => void>();
let openedByHand = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function dismissedThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) === LATEST_RELEASE_ID;
  } catch {
    return false;
  }
}

function notify() {
  for (const listener of listeners) listener();
}

/** Opens the drawer, from the avatar menu. */
export function openWhatsNew(): void {
  openedByHand = true;
  notify();
}

function close() {
  openedByHand = false;
  try {
    window.sessionStorage.setItem(DISMISSED_KEY, LATEST_RELEASE_ID);
  } catch {
    // Without storage it may open again on the next page; harmless.
  }
  notify();
}

export function WhatsNew({ seen }: { seen: string | null }) {
  const router = useRouter();
  const unseen = seen !== LATEST_RELEASE_ID;
  const open = useSyncExternalStore(
    subscribe,
    () => openedByHand || (unseen && !dismissedThisSession()),
    () => false,
  );
  const [understood, setUnderstood] = useState(false);
  const [saving, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  function done() {
    if (unseen && understood) {
      startTransition(async () => {
        await acknowledgeReleaseNotesAction();
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
        <header className="flex items-start justify-between gap-4 border-b border-white/60 px-6 pt-6 pb-4">
          <div>
            <h2 id="whats-new-title" className="text-xl font-bold text-[var(--color-ink)]">
              What&apos;s new
            </h2>
            <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
              Everything that changed in COEX, newest first.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-ink-subtle)] hover:bg-white/60 hover:text-[var(--color-ink)]"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 space-y-7 overflow-y-auto px-6 py-5">
          {RELEASE_NOTES.map((release, index) => (
            <article key={release.id}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-medium tracking-wide text-[var(--color-ink-subtle)] uppercase">
                  {release.date}
                </p>
                {index === 0 && unseen ? (
                  <span className="rounded-full bg-[var(--color-brand-red)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                    New
                  </span>
                ) : null}
              </div>
              <h3 className="mt-1 text-base font-semibold text-[var(--color-ink)]">
                {release.title}
              </h3>
              <div className="mt-3 space-y-3">
                {release.sections.map((section) => (
                  <section key={section.heading}>
                    <h4 className="text-sm font-semibold text-[var(--color-ink)]">
                      {section.heading}
                    </h4>
                    <ul className="mt-1 space-y-1.5">
                      {section.items.map((item) => (
                        <li
                          key={item}
                          className="flex gap-2 text-sm leading-relaxed text-[var(--color-ink-muted)]"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand-red)]/70"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </article>
          ))}
        </div>

        <footer className="border-t border-white/60 px-6 py-4">
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
          <Button type="button" className="w-full" disabled={saving} onClick={done}>
            {saving ? 'Saving' : unseen && understood ? 'Done' : 'Close'}
          </Button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
