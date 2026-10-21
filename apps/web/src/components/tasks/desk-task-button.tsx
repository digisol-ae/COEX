'use client';
import { createContext, useContext, useState, useTransition, type ReactNode } from 'react';
import { setDeskTaskAction } from '@/app/(app)/dashboard/actions';
import { useToast } from '@/components/ui/toast';

const DeskContext = createContext<{
  userId: string;
  selected: string[];
  assignedIds: string[];
  setSelected: (taskId: string, selected: boolean) => void;
} | null>(null);

export function DeskProvider({
  userId,
  initialIds,
  assignedIds,
  children,
}: {
  userId: string;
  initialIds: string[];
  assignedIds: string[];
  children: ReactNode;
}) {
  const [selected, setSelected] = useState(initialIds);
  const key = initialIds.join(',');
  const [previousKey, setPreviousKey] = useState(key);
  if (key !== previousKey) {
    setPreviousKey(key);
    setSelected(initialIds);
  }
  return (
    <DeskContext.Provider
      value={{
        userId,
        assignedIds,
        selected,
        setSelected: (id, add) => {
          setSelected((current) =>
            add ? [...new Set([...current, id])] : current.filter((value) => value !== id),
          );
        },
      }}
    >
      {children}
    </DeskContext.Provider>
  );
}

export function DeskTaskButton({
  taskId,
  assigneeIds,
  own = false,
  removeOnly = false,
}: {
  taskId: string;
  assigneeIds?: string[];
  own?: boolean;
  removeOnly?: boolean;
}) {
  const desk = useContext(DeskContext);
  const [pending, start] = useTransition();
  const { showToast } = useToast();
  if (
    !desk ||
    (!own &&
      !assigneeIds?.includes(desk.userId) &&
      !desk.assignedIds.includes(taskId) &&
      !removeOnly)
  )
    return null;
  const selected = desk.selected.includes(taskId);
  const label = selected || removeOnly ? 'Remove from My Desk' : 'Add to My Desk';
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={pending}
      className={
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] disabled:opacity-40 ' +
        (selected ? 'text-[var(--color-status-ok)]' : '')
      }
      onClick={(event) => {
        event.stopPropagation();
        start(async () => {
          const result = await setDeskTaskAction(taskId, !selected && !removeOnly);
          if (result.error) {
            showToast(result.error, 'alert');
            return;
          }
          desk.setSelected(taskId, !selected && !removeOnly);
          showToast(selected || removeOnly ? 'Removed from My Desk.' : 'Added to My Desk.');
        });
      }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="4.75" r="3.1" />
        <path d="M6.5 12V10c0-1.3 3.5-2.2 5.5-2.2s5.5.9 5.5 2.2v2" />
        <path d="M2 12h20v2H2zM4 14v8h2v-8M18 14v8h2v-8" />
        {selected || removeOnly ? <path d="m9 19 2 2 4-5" /> : <path d="M12 17v4M10 19h4" />}
      </svg>
    </button>
  );
}
