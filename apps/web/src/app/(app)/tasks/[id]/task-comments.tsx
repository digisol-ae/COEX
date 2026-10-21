'use client';
import { TicketAttachmentPicker } from '@/components/ui/ticket-attachment-picker';
import { AttachmentItem } from '@/app/(app)/support/tickets/[id]/attachment-item';
import { UI_LABELS } from '@/components/ui/labels';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { BubbleText } from '../../support/tickets/[id]/bubble-text';
import { Button, Card, CardSection, Notice, Textarea } from '@/components/ui';
import { DetailPopup } from '@/components/ui/detail-popup';
import { IconButton } from '@/components/ui/icon-button';
import { MentionTextarea, type MentionPerson } from '@/components/ui/mention-textarea';
import { FoldedMessages } from '../../support/tickets/[id]/folded-messages';
import { formatDateTime } from '@coex/shared/tasks/dates';
import {
  addTaskCommentAction,
  deleteTaskUpdateAction,
  editTaskUpdateAction,
  type TaskFormState,
} from '../actions';

const initialState: TaskFormState = {};

export function TaskComments({
  taskId,
  canComment,
  comments,
  people,
  ticket,
}: {
  taskId: string;
  canComment: boolean;
  /** Who can be @mentioned here. */
  people: MentionPerson[];
  /** The ticket this task came from, whose internal notes are this conversation. */
  ticket: { id: string; number: string } | null;
  comments: {
    attachments?: { id: string; fileName: string; contentType: string; bytes: number }[];
    isSystem?: boolean;
    id: string;
    body: string;
    authorName: string;
    createdAt: Date;
    editedAt: Date | null;
    canEdit: boolean;
    canDelete: boolean;
  }[];
}) {
  const [state, formAction, pending] = useActionState(addTaskCommentAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const updates = comments
    .filter((comment) => !comment.isSystem)
    .sort(
      (a, b) =>
        (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
        (order === 'desc' ? -1 : 1),
    );
  const [draft, setDraft] = useState('');
  const [rowError, setRowError] = useState<string | null>(null);
  const [working, startWork] = useTransition();

  function saveEdit(commentId: string) {
    setRowError(null);
    startWork(async () => {
      const result = await editTaskUpdateAction({ taskId, commentId, body: draft });
      if (result.error) setRowError(result.error);
      else setEditingId(null);
    });
  }

  function remove(commentId: string) {
    setRowError(null);
    startWork(async () => {
      const result = await deleteTaskUpdateAction({ taskId, commentId });
      if (result.error) setRowError(result.error);
      setConfirmingId(null);
    });
  }

  useEffect(() => {
    if (state.saved) formRef.current?.reset();
  }, [state.saved]);

  const rendered = updates.map((comment) => (
    <div key={comment.id} className="flex justify-end text-sm">
      <div className="chat-bubble chat-note-orange w-full min-w-0 px-4 py-3 sm:max-w-[90%]">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-xs font-semibold text-[var(--chat-orange-name)]">
            {comment.authorName}
          </span>
          <span className="rounded-[var(--radius-control)] bg-[var(--color-surface)]/70 px-1.5 py-0.5 text-[10px] font-medium uppercase text-[var(--chat-orange-name)]">
            Internal note
          </span>
          <span className="text-xs text-[var(--color-ink-subtle)]">
            {formatDateTime(comment.createdAt)}
            {comment.editedAt ? ' · edited' : ''}
          </span>
          {comment.canEdit && editingId !== comment.id ? (
            <IconButton
              icon="edit"
              label="Edit update"
              onClick={() => {
                setRowError(null);
                setConfirmingId(null);
                setDraft(comment.body);
                setEditingId(comment.id);
              }}
            />
          ) : null}
          {comment.canDelete && confirmingId !== comment.id ? (
            <IconButton
              icon="remove"
              label="Delete this update"
              tone="danger"
              onClick={() => {
                setRowError(null);
                setEditingId(null);
                setConfirmingId(comment.id);
              }}
            />
          ) : null}
        </div>

        {editingId === comment.id ? (
          <div className="mt-1 space-y-2">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.currentTarget.value)}
              rows={3}
              maxLength={4000}
              autoFocus
            />
            <div className="flex gap-2">
              <Button type="button" disabled={working} onClick={() => saveEdit(comment.id)}>
                {working ? UI_LABELS.saving : UI_LABELS.save}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                {UI_LABELS.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-1">
            <BubbleText text={comment.body} />
            {comment.attachments?.length ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {comment.attachments.map((image) => (
                  <li key={image.id}>
                    <AttachmentItem
                      ticketId={taskId}
                      attachmentBase="/api/tasks"
                      attachment={{
                        id: image.id,
                        fileName: image.fileName,
                        sizeLabel: `${Math.round(image.bytes / 1024)} KB`,
                        previewable: ['image/png', 'image/jpeg', 'image/webp'].includes(
                          image.contentType,
                        ),
                      }}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        {confirmingId === comment.id ? (
          <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
            Delete this update?
            <Button
              type="button"
              variant="danger"
              disabled={working}
              onClick={() => remove(comment.id)}
            >
              {working ? 'Deleting…' : 'Delete'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConfirmingId(null)}>
              Keep
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  ));

  return (
    <Card>
      <CardSection title="Work updates">
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-ink-subtle)]">
            {ticket ? (
              <>
                Internal notes, shared with ticket{' '}
                <Link
                  href={`/support/tickets/${ticket.id}`}
                  className="font-medium text-[var(--color-ink-muted)] underline underline-offset-4"
                >
                  {ticket.number}
                </Link>
                : a note on either one shows on both. The customer never sees them.
              </>
            ) : (
              'Internal notes. The customer never sees them.'
            )}{' '}
            Type @ to mention a colleague; they get an email.
          </p>
          {canComment ? (
            <form
              ref={formRef}
              action={formAction}
              className="rounded-[var(--radius-card)] border border-[var(--color-line)] p-3"
            >
              <input type="hidden" name="taskId" value={taskId} />
              <label className="text-sm font-medium text-[var(--color-ink)]" htmlFor="task-comment">
                Add an update
              </label>
              <MentionTextarea
                people={people}
                id="task-comment"
                name="body"
                maxLength={4000}
                rows={3}
                placeholder="What did you do, find, or need next? Type @ to mention someone."
                className="mt-1.5 w-full rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none"
              />
              <TicketAttachmentPicker
                label="Upload attachment or paste an image"
                imagesOnly
                disabled={pending}
              />
              {state.error ? (
                <div className="mt-2">
                  <Notice tone="warn">{state.error}</Notice>
                </div>
              ) : null}
              <div className="mt-2 flex justify-end">
                <Button type="submit" disabled={pending}>
                  {pending ? 'Posting…' : 'Post update'}
                </Button>
              </div>
            </form>
          ) : null}
          {rowError ? <Notice tone="warn">{rowError}</Notice> : null}
          {comments.some((comment) => comment.isSystem) ? (
            <div className="flex items-center gap-1 text-xs text-[var(--color-ink-muted)]">
              Task history
              <DetailPopup title="Task history">
                <ul className="space-y-3">
                  {comments
                    .filter((comment) => comment.isSystem)
                    .map((comment) => (
                      <li key={comment.id} className="text-sm">
                        <p>{comment.body}</p>
                        <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                          By {comment.authorName} · {formatDateTime(comment.createdAt)}
                        </p>
                      </li>
                    ))}
                </ul>
              </DetailPopup>
            </div>
          ) : null}
          <div className="coex-filters flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-[var(--color-ink-muted)]">Conversation</h3>
            <label className="flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
              Message order
              <select
                aria-label="Message order"
                value={order}
                onChange={(event) => setOrder(event.target.value as 'asc' | 'desc')}
                className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-transparent px-2 py-1 text-xs text-[var(--color-ink)]"
              >
                <option value="asc">Ascending · Oldest first</option>
                <option value="desc">Descending · Newest first</option>
              </select>
            </label>
          </div>
          {updates.length ? (
            <div className="space-y-3">
              {rendered.length > 3 ? (
                <>
                  {rendered[0]}
                  <FoldedMessages key={order} count={rendered.length - 2}>
                    {rendered.slice(1, -1)}
                  </FoldedMessages>
                  {rendered[rendered.length - 1]}
                </>
              ) : (
                rendered
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-ink-subtle)]">No work updates yet.</p>
          )}
        </div>
      </CardSection>
    </Card>
  );
}
