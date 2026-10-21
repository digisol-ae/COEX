'use client';
import { useRef, useId, useEffect, type ReactNode } from 'react';
import { useSetupWorkspace } from '@/components/navigation/setup-workspace';
import { Button } from './index';
import { IconButton } from './icon-button';
export function SettingsDrawer({
  title,
  children,
  summary,
  open,
  onClose,
}: {
  title: string;
  children: ReactNode;
  summary?: ReactNode;
  open?: boolean;
  onClose?: () => void;
}) {
  const inSetup = useSetupWorkspace();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (open === true && !dialog.current?.open) dialog.current?.showModal();
    if (open === false && dialog.current?.open) dialog.current?.close();
  }, [open]);
  if (inSetup && open === undefined) return <>{children}</>;
  return (
    <section
      className={
        open === undefined
          ? 'rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3'
          : undefined
      }
    >
      {open === undefined ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 text-sm text-[var(--color-ink-muted)]">
            {summary ?? `Manage ${title.toLowerCase()} in the settings drawer.`}
          </div>
          <Button
            variant="secondary"
            onClick={() => dialog.current?.showModal()}
            aria-haspopup="dialog"
          >
            {title}
          </Button>
        </div>
      ) : null}
      <dialog
        ref={dialog}
        onClose={onClose}
        aria-labelledby={titleId}
        className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-3xl border-l border-[var(--color-line)] bg-[var(--color-canvas)] p-0 text-[var(--color-ink)] shadow-2xl backdrop:bg-[var(--color-popup-backdrop)]"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const box = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < box.left ||
              event.clientX > box.right ||
              event.clientY < box.top ||
              event.clientY > box.bottom
            )
              dialog.current?.close();
          }
        }}
      >
        <div className="flex h-full flex-col">
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <h2 id={titleId} className="font-semibold">
              {title}
            </h2>
            <IconButton
              icon="close"
              label="Close settings"
              onClick={() => dialog.current?.close()}
            />
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        </div>
      </dialog>
    </section>
  );
}
