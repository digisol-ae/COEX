'use client';

import { useId, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui';
import { IconButton } from '@/components/ui/icon-button';

/** Customer-specific tools stay together without narrowing the activity timeline. */
export function CustomerDrawer({
  name,
  contacts,
  sites,
  opportunities,
  children,
}: {
  name: string;
  contacts: number;
  sites: number;
  opportunities?: number;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => dialog.current?.showModal()}
        aria-haspopup="dialog"
      >
        <span className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect
              x="2"
              y="2"
              width="12"
              height="12"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <path d="M9.5 2v12" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          Customer details
        </span>
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-lg border-l border-[var(--color-line)] bg-[var(--color-canvas)] p-0 text-[var(--color-ink)] shadow-2xl backdrop:bg-[var(--color-popup-backdrop)] sm:rounded-l-2xl"
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const box = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom
          )
            dialog.current?.close();
        }}
      >
        <div className="flex h-full flex-col">
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <div className="min-w-0">
              <h2 id={titleId} className="font-semibold">
                Customer details
              </h2>
              <p className="mt-1 truncate text-sm text-[var(--color-ink-muted)]">{name}</p>
              <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                {contacts} contacts · {sites} sites
                {opportunities === undefined ? '' : ` · ${opportunities} opportunities`}
              </p>
            </div>
            <IconButton
              icon="close"
              label="Close customer details"
              onClick={() => dialog.current?.close()}
            />
          </header>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">{children}</div>
        </div>
      </dialog>
    </>
  );
}
