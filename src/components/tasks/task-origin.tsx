import { formatDateTime } from '@/modules/tasks/dates';
import type { TaskOrigin } from '@/modules/tasks/services/task.service';

/**
 * Who created a task and who assigned it (John, 1 Oct 2026). The viewer's own assignment reads
 * "Assigned to you by", because that is the question they are asking; other people's follow.
 */
export function TaskOriginLines({
  origin,
  viewerId,
  people,
  className = 'text-xs text-[var(--color-ink-muted)]',
}: {
  origin: TaskOrigin;
  viewerId: string;
  people: { id: string; name: string }[];
  className?: string;
}) {
  const names = new Map(people.map((person) => [person.id, person.name]));
  const mine = origin.assignedBy.filter((entry) => entry.userId === viewerId);
  const others = origin.assignedBy.filter(
    (entry) => entry.userId !== viewerId && names.has(entry.userId),
  );
  if (!origin.createdBy && !origin.assignedBy.length) return null;

  return (
    <ul className={className}>
      {origin.createdBy ? (
        <li>
          Created by <b className="font-medium">{origin.createdBy.name}</b>,{' '}
          {formatDateTime(origin.createdBy.at)}
        </li>
      ) : null}
      {mine.map((entry) => (
        <li key={entry.userId}>
          Assigned to you by <b className="font-medium">{entry.byName}</b>,{' '}
          {formatDateTime(entry.at)}
        </li>
      ))}
      {others.map((entry) => (
        <li key={entry.userId}>
          {names.get(entry.userId)} assigned by <b className="font-medium">{entry.byName}</b>,{' '}
          {formatDateTime(entry.at)}
        </li>
      ))}
    </ul>
  );
}
