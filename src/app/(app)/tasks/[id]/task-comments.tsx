'use client';

import { useActionState, useEffect, useRef } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button, Card, CardSection, Notice } from '@/components/ui';
import { formatDateTime } from '@/modules/tasks/dates';
import { addTaskCommentAction, type TaskFormState } from '../actions';

const initialState: TaskFormState = {};

export function TaskComments({
  taskId,
  canComment,
  comments,
}: {
  taskId: string;
  canComment: boolean;
  comments: { id: string; body: string; authorName: string; createdAt: Date }[];
}) {
  const [state, formAction, pending] = useActionState(addTaskCommentAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.saved) formRef.current?.reset();
  }, [state.saved]);

  return (
    <Card>
      <CardSection title="Work updates">
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-ink-subtle)]">Internal notes. Updates from a ticket-linked task also appear as internal notes on that ticket.</p>
          {comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2.5 text-sm">
                  <Avatar name={comment.authorName} size="small" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium text-[var(--color-ink)]">{comment.authorName}</span>
                      <span className="text-xs text-[var(--color-ink-subtle)]">{formatDateTime(comment.createdAt)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[var(--color-ink-muted)]">{comment.body}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-ink-subtle)]">No work updates yet.</p>
          )}

          {canComment ? (
            <form ref={formRef} action={formAction} className="border-t border-[var(--color-line)] pt-3">
              <input type="hidden" name="taskId" value={taskId} />
              <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="task-comment">Add an update</label>
              <textarea id="task-comment" name="body" required maxLength={4000} rows={3} placeholder="What did you do, find, or need next?" className="mt-1.5 w-full rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none" />
              {state.error ? <div className="mt-2"><Notice tone="warn">{state.error}</Notice></div> : null}
              <div className="mt-2 flex justify-end"><Button type="submit" disabled={pending}>{pending ? 'Posting…' : 'Post update'}</Button></div>
            </form>
          ) : null}
        </div>
      </CardSection>
    </Card>
  );
}
