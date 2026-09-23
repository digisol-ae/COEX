'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { clsx } from 'clsx';
import { Badge, EmptyState, Table, Td, Th } from '@/components/ui';
import { Progress } from '@/components/ui/progress';
import { Monogram } from '@/components/ui/monogram';
import { Avatar } from '@/components/ui/avatar';
import { reorderSpacesAction } from '../tasks/actions';

export interface SpaceRow {
  id: string;
  name: string;
  description: string | null;
  organisationId: string | null;
  dueDate: string | null;
  openTaskCount: number;
  totalTaskCount: number;
  progressPercent: number;
  memberIds: string[];
}

export interface FolderRow {
  id: string;
  spaceId: string;
  name: string;
  isPrivate: boolean;
}

/**
 * The Spaces list, reorderable by drag when the tenant has more than one space and the person can
 * manage the tenant's work. Order is saved after the drop, not on every frame, so a full drag
 * across the list is one write, not dozens.
 */
export function SpacesTable({
  spaces,
  folders,
  customerNames,
  userNames,
  canManage,
}: {
  spaces: SpaceRow[];
  folders: FolderRow[];
  customerNames: Record<string, string>;
  userNames: Record<string, string>;
  canManage: boolean;
}) {
  const [order, setOrder] = useState(spaces);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (order.length === 0) {
    return <EmptyState message="No spaces yet. Create one such as dOne Platform or Project Management." />;
  }

  function moveTo(targetId: string) {
    if (!draggingId || draggingId === targetId) return;

    setOrder((current) => {
      const from = current.findIndex((row) => row.id === draggingId);
      const to = current.findIndex((row) => row.id === targetId);
      if (from === -1 || to === -1) return current;

      const next = current.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function commit() {
    if (!draggingId) return;
    setDraggingId(null);

    startTransition(async () => {
      await reorderSpacesAction(order.map((row) => row.id));
    });
  }

  return (
    <Table>
      <thead>
        <tr>
          {canManage ? <Th>{''}</Th> : null}
          <Th>Space</Th>
          <Th>Folders</Th>
          <Th>Customer</Th>
          <Th>Members</Th>
          <Th>Progress</Th>
          <Th>Open</Th>
          <Th>Due</Th>
        </tr>
      </thead>
      <tbody>
        {order.map((space) => {
          const inside = folders.filter((folder) => folder.spaceId === space.id);

          return (
            <tr
              key={space.id}
              draggable={canManage}
              onDragStart={() => setDraggingId(space.id)}
              onDragOver={(event) => {
                if (!draggingId) return;
                event.preventDefault();
                moveTo(space.id);
              }}
              onDragEnd={commit}
              onDrop={(event) => event.preventDefault()}
              className={clsx(draggingId === space.id && 'opacity-50')}
            >
              {canManage ? (
                <Td className="w-6 cursor-grab text-[var(--color-ink-subtle)] active:cursor-grabbing">
                  <DragHandle />
                </Td>
              ) : null}

              <Td>
                <div className="flex items-center gap-2.5">
                  <Monogram name={space.name} />
                  <div className="min-w-0">
                    <Link
                      href={`/spaces/${space.id}`}
                      className="block truncate font-medium text-[var(--color-ink)] underline-offset-4 hover:underline"
                    >
                      {space.name}
                    </Link>
                    {space.description ? (
                      <div className="truncate text-xs text-[var(--color-ink-subtle)]">
                        {space.description}
                      </div>
                    ) : null}
                  </div>
                </div>
              </Td>

              <Td className="text-[var(--color-ink-muted)]">
                {inside.length === 0 ? (
                  '—'
                ) : (
                  <span className="flex flex-wrap gap-1">
                    {inside.slice(0, 3).map((folder) => (
                      <span
                        key={folder.id}
                        className="rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] px-1.5 py-0.5 text-[11px]"
                      >
                        {folder.isPrivate ? '🔒 ' : ''}
                        {folder.name}
                      </span>
                    ))}
                    {inside.length > 3 ? (
                      <span className="text-[11px]">and {inside.length - 3} more</span>
                    ) : null}
                  </span>
                )}
              </Td>

              <Td className="text-[var(--color-ink-muted)]">
                {space.organisationId ? (customerNames[space.organisationId] ?? 'Unknown') : '—'}
              </Td>

              <Td>
                {space.memberIds.length ? (
                  <span className="flex -space-x-1.5">
                    {space.memberIds.map((id) => (
                      <Avatar key={id} name={userNames[id] ?? 'Unknown'} size="small" />
                    ))}
                  </span>
                ) : (
                  <span className="text-xs text-[var(--color-ink-subtle)]">Everyone</span>
                )}
              </Td>

              <Td className="w-48">
                <Progress percent={space.progressPercent} label={`${space.name} progress`} />
              </Td>

              <Td>
                <Badge tone={space.openTaskCount > 0 ? 'info' : 'ok'}>
                  {space.openTaskCount} of {space.totalTaskCount}
                </Badge>
              </Td>

              <Td className="text-[var(--color-ink-muted)]">
                {space.dueDate ? new Date(space.dueDate).toLocaleDateString('en-GB') : '—'}
              </Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

function DragHandle() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="none" aria-hidden="true">
      <circle cx="2.5" cy="2.5" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="2.5" r="1.2" fill="currentColor" />
      <circle cx="2.5" cy="7" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="7" r="1.2" fill="currentColor" />
      <circle cx="2.5" cy="11.5" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="11.5" r="1.2" fill="currentColor" />
    </svg>
  );
}
