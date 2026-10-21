'use client';
import { UI_LABELS } from '@/components/ui/labels';

import { useRef, type ReactNode } from 'react';
import { IconButton, type IconName } from './icon-button';

/** Shared one-click detail/history popup. Native dialogs handle focus, Escape and nested panels. */
export function DetailPopup({
  title,
  icon = 'history',
  children,
  onOpen,
}: {
  title: string;
  icon?: IconName;
  children: ReactNode;
  onOpen?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <IconButton
        icon={icon}
        label={title}
        onClick={() => {
          onOpen?.();
          dialog.current?.showModal();
        }}
      />
      <dialog
        ref={dialog}
        aria-label={title}
        className="popup-glass m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto p-4 text-[var(--color-ink)]"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold">{title}</h2>
          <IconButton
            icon="close"
            label={UI_LABELS.close}
            onClick={() => dialog.current?.close()}
          />
        </div>
        {children}
      </dialog>
    </>
  );
}
