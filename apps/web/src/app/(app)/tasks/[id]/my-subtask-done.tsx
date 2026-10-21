'use client';

import { useTransition } from 'react';
import { setMySubtaskDoneAction } from '../actions';
import { useToast } from '@/components/ui/toast';

export function MySubtaskDone({ taskId, done }: { taskId: string; done: boolean }) {
  const [pending, start] = useTransition();
  const { showToast } = useToast();
  return (
    <button
      type="button"
      disabled={pending}
      title={
        done
          ? 'Show this task in your active work again'
          : 'Hide from your active work; the shared task stays open'
      }
      className="rounded-full border border-[var(--color-line)] px-2 py-1 text-xs text-[var(--color-ink-muted)] disabled:opacity-50"
      onClick={() =>
        start(async () => {
          const result = await setMySubtaskDoneAction(taskId, !done);
          showToast(
            result.error ??
              (done
                ? 'Your work is active again.'
                : 'My subtask done. Hidden from your active work.'),
            result.error ? 'alert' : 'ok',
          );
        })
      }
    >
      {pending ? 'Saving…' : done ? 'Resume my work' : 'My subtask done'}
    </button>
  );
}
