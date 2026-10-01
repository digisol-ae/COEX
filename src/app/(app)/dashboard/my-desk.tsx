'use client';
import { DeskTaskButton } from '@/components/tasks/desk-task-button';
import { TaskPreview } from '@/components/tasks/task-preview';
import { useState, useTransition, type ReactNode } from 'react';
import { Button, Card, CardSection } from '@/components/ui';
import type { TaskSummary } from '@/modules/tasks/services/task.service';
import { finishDeskAction, setDeskTaskAction } from './actions';

export function MyDesk({
  tasks,
  score,
  confirmedToday = false,
  children,
}: {
  tasks: TaskSummary[];
  score: {
    value: number;
    completedOnTime: number;
    overdue: number;
    dueToday: number;
    dueTomorrowNotStarted: number;
    dueSoonInProgress: number;
  };
  confirmedToday?: boolean;
  children?: ReactNode;
}) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [saved, setSaved] = useState(false);
  const updated = confirmedToday || saved;
  const unfinished = tasks.filter((task) => !task.isClosed).length;
  const finish = () =>
    start(async () => {
      await finishDeskAction();
      setSaved(true);
      setConfirming(false);
    });
  return (
    <>
      <Card
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const id = event.dataTransfer.getData('application/coex-task');
          if (id)
            start(async () => {
              await setDeskTaskAction(id, true);
            });
        }}
      >
        <CardSection title="My desk">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--color-ink-muted)]">
              Drop a task here to commit it to your day.
            </p>
            <Button type="button" disabled={pending} onClick={() => setConfirming(true)}>
              {updated ? 'Update today’s summary' : 'I am done'}
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
            <span>
              On time <b>{score.completedOnTime}</b>
            </span>
            <span>
              Overdue <b>{score.overdue}</b>
            </span>
            <span>
              Today <b>{score.dueToday}</b>
            </span>
            <span>
              Tomorrow <b>{score.dueTomorrowNotStarted}</b>
            </span>
            <span>
              Due soon <b>{score.dueSoonInProgress}</b>
            </span>
          </div>
          {tasks.length ? (
            <div className="mt-3">{children}</div>
          ) : (
            <p className="mt-3 rounded-[var(--radius-control)] border border-dashed border-[var(--color-line-strong)] p-5 text-center text-sm text-[var(--color-ink-subtle)]">
              Drop tasks here
            </p>
          )}
        </CardSection>
      </Card>
      {confirming ? (
        <div className="popup-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirm daily snapshot"
            className="popup-glass w-full max-w-md p-5"
          >
            <h2 className="text-lg font-semibold">
              {updated ? 'Update today’s summary?' : 'Finish today?'}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              {unfinished
                ? `${unfinished} desk task${unfinished === 1 ? ' is' : 's are'} still not completed. This will be recorded in today’s performance snapshot.`
                : 'All desk tasks are complete. This will save today’s performance snapshot.'}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={pending} onClick={finish}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function AvailableDeskTasks({ tasks }: { tasks: TaskSummary[] }) {
  const [preview, setPreview] = useState<TaskSummary | null>(null);
  return (
    <>
      <Card className="mt-4">
        <CardSection title="My available tasks">
          <p className="text-sm text-[var(--color-ink-muted)]">
            Drag a task onto My Desk, or use the desk icon. Click its title to preview.
          </p>
          {tasks.length ? (
            <ul className="mt-3 divide-y divide-[var(--color-line)]">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  draggable
                  onDragStart={(event) =>
                    event.dataTransfer.setData('application/coex-task', task.id)
                  }
                  className="flex min-w-0 cursor-grab items-center justify-between gap-3 py-3 text-sm active:cursor-grabbing"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left hover:underline"
                    title={`${task.title}\nClick to preview, or drag onto My Desk`}
                    onClick={() => setPreview(task)}
                  >
                    ⋮⋮ {task.title}
                  </button>
                  <DeskTaskButton taskId={task.id} assigneeIds={task.assigneeIds} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--color-ink-subtle)]">
              No other assigned tasks are available.
            </p>
          )}
        </CardSection>
      </Card>
      {preview ? (
        <TaskPreview key={preview.id} task={preview} onClose={() => setPreview(null)} />
      ) : null}
    </>
  );
}
