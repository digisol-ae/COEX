'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
export function QuickCreate({
  task,
  ticket,
  lead,
}: {
  task: boolean;
  ticket: boolean;
  lead: boolean;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const router = useRouter();
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node) && menu.current) menu.current.open = false;
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);
  if (!task && !ticket && !lead) return null;
  return (
    <details
      ref={menu}
      className="relative shrink-0"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && menu.current) {
          menu.current.open = false;
          menu.current.querySelector('summary')?.focus();
        }
      }}
    >
      <summary
        aria-label="Quick create"
        title="Quick create"
        className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-[var(--color-ink)] hover:bg-[var(--color-surface-sunken)] [&::-webkit-details-marker]:hidden"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </summary>
      <div
        className="absolute right-0 top-11 z-50 w-44 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-1 shadow-xl"
        aria-label="Create new"
      >
        {[
          [task, '/tasks', 'Task'],
          [ticket, '/support/tickets', 'Ticket'],
          [lead, '/leads', 'Lead'],
        ]
          .filter(([allowed]) => allowed)
          .map(([, path, label]) => (
            <button
              type="button"
              key={String(path)}
              aria-label={`Create ${label}`}
              className="block min-h-11 w-full rounded-lg px-3 text-left text-sm hover:bg-[var(--color-surface-sunken)]"
              onClick={() => {
                if (menu.current) menu.current.open = false;
                router.push(`${path}?create=${Date.now()}`);
              }}
            >
              {label}
            </button>
          ))}
      </div>
    </details>
  );
}
