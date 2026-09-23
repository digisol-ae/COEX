'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { clsx } from 'clsx';
import { Monogram } from '@/components/ui/monogram';
import { DocumentBadge } from '@/components/ui/task-badges';
import { quickAddFolderAction, quickAddSpaceAction, reorderFoldersAction, reorderSpacesAction } from '@/app/(app)/tasks/actions';

/**
 * The tree in the sidebar: space, folder, task, subtask. Four levels, the same four the data has.
 *
 * Everything loads on expand rather than with the page. A tenant with fifty spaces and a thousand
 * tasks would otherwise pay for that on every screen, including the ones that never show it, and
 * the sidebar is the last place that should make a page feel slow. What has been fetched is kept
 * for the rest of the visit, so opening a space twice costs one request.
 *
 * The plus beside Spaces makes a space; the plus beside a space makes a folder in it. Creating is
 * where you are looking, in one field, because naming a thing and configuring it are separate
 * moments and only the first one is urgent.
 */

interface TreeSpace {
  id: string;
  name: string;
  openTaskCount: number;
}

interface TreeTask {
  id: string;
  number: string;
  title: string;
  isClosed: boolean;
  documentCount: number;
  documentLinks: { id: string; title: string; url: string }[];
  subtasks: { id: string; title: string; done: boolean }[];
}

interface TreeFolder {
  id: string | null;
  name: string;
  isPrivate: boolean;
  tasks: TreeTask[];
}

export function SpaceTree({ canManage }: { canManage: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [spaces, setSpaces] = useState<TreeSpace[] | null>(null);
  const [foldersBySpace, setFoldersBySpace] = useState<Record<string, TreeFolder[]>>({});
  const [expandedSpaces, setExpandedSpaces] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [draggingSpaceId, setDraggingSpaceId] = useState<string | null>(null);
  const [draggingFolderKey, setDraggingFolderKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function loadSpaces() {
    setLoading('spaces');

    try {
      const response = await fetch('/api/navigation/spaces');
      const data = (await response.json()) as { spaces?: TreeSpace[] };
      setSpaces(data.spaces ?? []);
    } catch {
      // A failed fetch leaves the tree empty rather than breaking the sidebar around it.
      setSpaces([]);
    } finally {
      setLoading(null);
    }
  }

  async function toggleTree() {
    const next = !open;
    setOpen(next);

    if (next && spaces === null) await loadSpaces();
  }

  async function loadFolders(spaceId: string) {
    setLoading(spaceId);

    try {
      const response = await fetch(`/api/navigation/spaces/${spaceId}/folders`);
      const data = (await response.json()) as { folders?: TreeFolder[] };
      setFoldersBySpace((current) => ({ ...current, [spaceId]: data.folders ?? [] }));
    } catch {
      setFoldersBySpace((current) => ({ ...current, [spaceId]: [] }));
    } finally {
      setLoading(null);
    }
  }

  async function toggleSpace(spaceId: string) {
    const isOpen = expandedSpaces.includes(spaceId);

    setExpandedSpaces((current) =>
      isOpen ? current.filter((id) => id !== spaceId) : [...current, spaceId],
    );

    if (!isOpen && !foldersBySpace[spaceId]) await loadFolders(spaceId);
  }

  function addSpace(name: string) {
    startTransition(async () => {
      const result = await quickAddSpaceAction({ name });
      if (!result.error) {
        await loadSpaces();
        router.refresh();
      }
    });
  }

  function addFolder(spaceId: string, name: string) {
    startTransition(async () => {
      const result = await quickAddFolderAction({ spaceId, name });
      if (!result.error) {
        await loadFolders(spaceId);
        setExpandedSpaces((current) =>
          current.includes(spaceId) ? current : [...current, spaceId],
        );
        router.refresh();
      }
    });
  }

  function moveSpaceTo(targetId: string) {
    if (!draggingSpaceId || draggingSpaceId === targetId) return;

    setSpaces((current) => {
      if (!current) return current;
      const from = current.findIndex((row) => row.id === draggingSpaceId);
      const to = current.findIndex((row) => row.id === targetId);
      if (from === -1 || to === -1) return current;

      const next = current.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function commitSpaceOrder() {
    if (!draggingSpaceId || !spaces) return;
    setDraggingSpaceId(null);

    startTransition(async () => {
      await reorderSpacesAction(spaces.map((row) => row.id));
    });
  }

  function moveFolderTo(spaceId: string, targetId: string) {
    if (!draggingFolderKey || draggingFolderKey === targetId) return;

    setFoldersBySpace((current) => {
      const list = current[spaceId];
      if (!list) return current;

      const from = list.findIndex((folder) => folder.id === draggingFolderKey);
      const to = list.findIndex((folder) => folder.id === targetId);
      if (from === -1 || to === -1) return current;

      const next = list.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...current, [spaceId]: next };
    });
  }

  function commitFolderOrder(spaceId: string) {
    if (!draggingFolderKey) return;
    setDraggingFolderKey(null);

    const list = foldersBySpace[spaceId];
    if (!list) return;

    const orderedIds = list.map((folder) => folder.id).filter((id): id is string => id !== null);
    if (orderedIds.length === 0) return;

    startTransition(async () => {
      await reorderFoldersAction(spaceId, orderedIds);
    });
  }


  return (
    <div>
      <div className="flex items-center">
        <Link
          href="/spaces"
          className={clsx(
            'flex-1 rounded-[var(--radius-control)] px-2 py-2 text-[13px] transition-colors',
            pathname.startsWith('/spaces')
              ? 'bg-[var(--color-surface-muted)] font-medium text-[var(--color-ink)]'
              : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]',
          )}
        >
          Spaces
        </Link>

        {canManage ? (
          <PlusButton
            label="Add a space"
            onClick={() => {
              setOpen(true);
              if (spaces === null) void loadSpaces();
              setAdding('space');
            }}
          />
        ) : null}

        <button
          type="button"
          onClick={toggleTree}
          aria-expanded={open}
          aria-label={open ? 'Hide the space list' : 'Show the space list'}
          className="flex h-8 w-7 items-center justify-center text-[var(--color-ink-subtle)] transition-colors hover:text-[var(--color-ink)]"
        >
          <Chevron open={open} />
        </button>
      </div>

      {open ? (
        <div className="mt-0.5 ml-2 space-y-0.5 border-l border-[var(--color-line)] pl-2">
          {adding === 'space' ? (
            <NameField
              placeholder="Space name"
              onCancel={() => setAdding(null)}
              onSubmit={(name) => {
                setAdding(null);
                addSpace(name);
              }}
            />
          ) : null}

          {loading === 'spaces' ? <Loading /> : null}

          {spaces?.length === 0 && loading !== 'spaces' && adding !== 'space' ? (
            <p className="px-2 py-1.5 text-xs text-[var(--color-ink-subtle)]">No spaces yet</p>
          ) : null}

          {spaces?.map((space) => {
            const spaceOpen = expandedSpaces.includes(space.id);
            const folders = foldersBySpace[space.id];

            return (
              <div
                key={space.id}
                draggable={canManage}
                onDragStart={() => setDraggingSpaceId(space.id)}
                onDragOver={(event) => {
                  if (!draggingSpaceId) return;
                  event.preventDefault();
                  moveSpaceTo(space.id);
                }}
                onDragEnd={commitSpaceOrder}
                onDrop={(event) => event.preventDefault()}
                className={clsx(draggingSpaceId === space.id && 'opacity-50')}
              >
                <div className="flex items-center">
                  <span
                    className={clsx(
                      'flex h-6 w-3 shrink-0 items-center justify-center text-[var(--color-ink-subtle)]',
                      canManage ? 'cursor-grab active:cursor-grabbing' : 'invisible',
                    )}
                  >
                    <DragDots />
                  </span>

                  <Link
                    href={`/spaces/${space.id}`}
                    className={clsx(
                      'flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-xs transition-colors',
                      pathname === `/spaces/${space.id}`
                        ? 'bg-[var(--color-surface-muted)] text-[var(--color-ink)]'
                        : 'text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]',
                    )}
                  >
                    <Monogram name={space.name} size="small" />
                    <span className="truncate">{space.name}</span>
                  </Link>

                  {space.openTaskCount > 0 ? (
                    <span className="px-1 text-[10px] text-[var(--color-ink-subtle)] tabular-nums">
                      {space.openTaskCount}
                    </span>
                  ) : null}

                  {canManage ? (
                    <PlusButton
                      label={`Add a folder to ${space.name}`}
                      small
                      onClick={() => {
                        setExpandedSpaces((current) =>
                          current.includes(space.id) ? current : [...current, space.id],
                        );

                        if (!foldersBySpace[space.id]) void loadFolders(space.id);
                        setAdding(space.id);
                      }}
                    />
                  ) : null}

                  <button
                    type="button"
                    onClick={() => toggleSpace(space.id)}
                    aria-expanded={spaceOpen}
                    aria-label={`${spaceOpen ? 'Hide' : 'Show'} what is inside ${space.name}`}
                    className="flex h-6 w-5 items-center justify-center text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
                  >
                    <Chevron open={spaceOpen} small />
                  </button>
                </div>

                {spaceOpen ? (
                  <div className="ml-2 space-y-0.5 border-l border-[var(--color-line)] pl-2">
                    {adding === space.id ? (
                      <NameField
                        placeholder="Folder name"
                        onCancel={() => setAdding(null)}
                        onSubmit={(name) => {
                          setAdding(null);
                          addFolder(space.id, name);
                        }}
                      />
                    ) : null}

                    {loading === space.id ? <Loading /> : null}

                    {folders?.length === 0 && loading !== space.id && adding !== space.id ? (
                      <p className="px-2 py-1 text-[11px] text-[var(--color-ink-subtle)]">
                        Nothing in here yet
                      </p>
                    ) : null}

                    {folders?.map((folder) => {
                      const key = `${space.id}:${folder.id ?? 'none'}`;
                      const folderOpen = expandedFolders.includes(key);

                      return (
                        <div
                          key={key}
                          draggable={canManage && folder.id !== null}
                          onDragStart={() => {
                            if (folder.id) setDraggingFolderKey(folder.id);
                          }}
                          onDragOver={(event) => {
                            if (!draggingFolderKey || !folder.id) return;
                            event.preventDefault();
                            moveFolderTo(space.id, folder.id);
                          }}
                          onDragEnd={() => commitFolderOrder(space.id)}
                          onDrop={(event) => event.preventDefault()}
                          className={clsx(draggingFolderKey === folder.id && 'opacity-50')}
                        >
                          <div className="flex items-center">
                            {canManage && folder.id !== null ? (
                              <span className="flex h-5 w-2.5 shrink-0 cursor-grab items-center justify-center text-[var(--color-ink-subtle)] active:cursor-grabbing">
                                <DragDots small />
                              </span>
                            ) : null}

                            <Link
                              href={
                                folder.id
                                  ? `/spaces/${space.id}?folder=${folder.id}`
                                  : `/spaces/${space.id}`
                              }
                              className="flex min-w-0 flex-1 items-center gap-1.5 truncate rounded-[var(--radius-control)] px-2 py-1 text-[11px] text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
                            >
                              {folder.isPrivate ? <Lock /> : <FolderIcon />}
                              <span className="truncate">{folder.name}</span>
                            </Link>

                            {folder.tasks.length > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedFolders((current) =>
                                    folderOpen
                                      ? current.filter((entry) => entry !== key)
                                      : [...current, key],
                                  )
                                }
                                aria-expanded={folderOpen}
                                aria-label={`${folderOpen ? 'Hide' : 'Show'} tasks in ${folder.name}`}
                                className="flex h-5 w-5 items-center justify-center text-[var(--color-ink-subtle)] hover:text-[var(--color-ink)]"
                              >
                                <Chevron open={folderOpen} small />
                              </button>
                            ) : null}
                          </div>

                          {folderOpen ? (
                            <div className="ml-2 border-l border-[var(--color-line)] pl-2">
                              {folder.tasks.map((task) => (
                                <div key={task.id}>
                                  <div className="flex min-w-0 items-center gap-1">
                                    <Link
                                      href={`/tasks/${task.id}`}
                                      className={clsx(
                                        'block min-w-0 flex-1 truncate rounded-[var(--radius-control)] px-2 py-1 text-[11px] transition-colors hover:text-[var(--color-ink)]',
                                        task.isClosed
                                          ? 'text-[var(--color-ink-subtle)] line-through'
                                          : 'text-[var(--color-ink-muted)]',
                                        pathname === `/tasks/${task.id}` &&
                                          'bg-[var(--color-surface-muted)] text-[var(--color-ink)]',
                                      )}
                                    >
                                      {task.title}
                                    </Link>

                                    {task.documentCount > 0 ? (
                                      <DocumentBadge links={task.documentLinks} />
                                    ) : null}
                                  </div>

                                  {task.subtasks.length > 0 ? (
                                    <div className="ml-2 border-l border-[var(--color-line)] pl-2">
                                      {task.subtasks.map((subtask) => (
                                        <p
                                          key={subtask.id}
                                          className={clsx(
                                            'truncate px-2 py-0.5 text-[11px]',
                                            subtask.done
                                              ? 'text-[var(--color-ink-subtle)] line-through'
                                              : 'text-[var(--color-ink-muted)]',
                                          )}
                                        >
                                          {subtask.title}
                                        </p>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function NameField({
  placeholder,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');

  return (
    <form
      className="px-1 py-0.5"
      onSubmit={(event) => {
        event.preventDefault();

        const value = name.trim();
        if (value) onSubmit(value);
        else onCancel();
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => {
          if (!name.trim()) onCancel();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2 py-1 text-[11px] text-[var(--color-ink)] focus:outline-none"
      />
    </form>
  );
}

function PlusButton({
  label,
  onClick,
  small,
}: {
  label: string;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx(
        'flex items-center justify-center rounded-[var(--radius-control)] text-[var(--color-ink-subtle)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]',
        small ? 'h-5 w-5' : 'h-7 w-7',
      )}
    >
      <svg
        width={small ? 10 : 12}
        height={small ? 10 : 12}
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path d="M6 2.5v7M2.5 6h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function DragDots({ small }: { small?: boolean }) {
  const size = small ? 8 : 10;

  return (
    <svg width={size} height={size * 1.4} viewBox="0 0 8 12" fill="none" aria-hidden="true">
      <circle cx="2" cy="2" r="1" fill="currentColor" />
      <circle cx="6" cy="2" r="1" fill="currentColor" />
      <circle cx="2" cy="6" r="1" fill="currentColor" />
      <circle cx="6" cy="6" r="1" fill="currentColor" />
      <circle cx="2" cy="10" r="1" fill="currentColor" />
      <circle cx="6" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}

function Loading() {
  return <p className="px-2 py-1.5 text-xs text-[var(--color-ink-subtle)]">Loading</p>;
}

function FolderIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M1.5 3.5A1 1 0 0 1 2.5 2.5h2l1 1.4h4A1 1 0 0 1 10.5 5v3.5a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Lock() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="2.5" y="5.5" width="7" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
      <path d="M4.2 5.5V4a1.8 1.8 0 0 1 3.6 0v1.5" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

function Chevron({ open, small }: { open: boolean; small?: boolean }) {
  const size = small ? 10 : 12;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={clsx('transition-transform', open ? 'rotate-90' : 'rotate-0')}
    >
      <path
        d="M4.5 2.5L8 6l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
