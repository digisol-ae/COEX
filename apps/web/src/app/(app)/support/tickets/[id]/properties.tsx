'use client';
import { UI_LABELS } from '@/components/ui/labels';

import { DeskTaskButton } from '@/components/tasks/desk-task-button';

import Link from 'next/link';
import { useActionState, useRef, useState, useTransition, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { Button, Field, Input, Notice, Select } from '@/components/ui';
import { CardSection } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { IconButton } from '@/components/ui/icon-button';
import { TicketPicker } from './ticket-picker';
import { STATUS_LABELS, canMoveTo } from '@/modules/tickets/labels';
import type { Priority, TicketStatus } from '@/modules/tickets/services/ticket.service';
import {
  assignAction,
  escalateAction,
  linkAction,
  mergeAction,
  moveQueueAction,
  setPriorityAction,
  setStatusAction,
  unlinkAction,
  type SupportFormState,
} from '../../actions';

const initialState: SupportFormState = {};

interface TicketProperties {
  id: string;
  status: TicketStatus;
  priority: Priority;
  queueId: string;
  assigneeId: string | null;
  escalatedTaskId: string | null;
  escalatedTaskNumber: string | null;
  linkedTickets: { id: string; number: string; subject: string; status: string }[];
  isOpen: boolean;
  isMerged: boolean;
  firstRespondedAt: Date | null;
  resolvedAt: Date | null;
}

/**
 * Everything about the ticket that is not the conversation, in one compact card (John's team,
 * 18 Oct 2026: four stacked cards and four forms were too much room for what is mostly a row of
 * values). Status, owner, priority and queue are badges that are also the controls; the second row
 * carries the clocks, the timer, the time, engineering and related tickets as badges and small
 * buttons. Forms (escalate, link, merge) open as popups, so the page never jumps.
 *
 * Each control saves on change rather than collecting into a form with a Save button, because an
 * agent changing an owner mid conversation should not have to remember a second step. The status
 * list only offers moves the service actually allows, so a refusal is something you cannot reach
 * rather than an error you have to read.
 */
export function TicketBar({
  ticket,
  queues,
  users,
  spaces,
  canManage,
  timer,
  loggedLabel,
  timeEntries,
}: {
  ticket: TicketProperties;
  queues: { id: string; name: string }[];
  users: { id: string; name: string }[];
  spaces: { id: string; name: string }[];
  canManage: boolean;
  /** Start and stop, and Add time. */
  timer: ReactNode;
  /** "2m logged by you", or null when nothing is logged. */
  loggedLabel: string | null;
  /** Each person's time entries, shown when the time badge is opened. */
  timeEntries: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const timeDialog = useRef<HTMLDialogElement>(null);
  const [, startTransition] = useTransition();

  function run(work: () => Promise<SupportFormState>) {
    setError(null);

    startTransition(async () => {
      const result = await work();
      if (result.error) setError(result.error);
    });
  }

  const locked = !canManage || ticket.isMerged;
  const owner = users.find((user) => user.id === ticket.assigneeId);

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-transparent">
      <CardSection>
        {error ? (
          <div className="mb-2">
            <Notice tone="alert">{error}</Notice>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <BadgeSelect
            label="Status"
            icon={ticket.status === 'escalated' ? <EngineeringGlyph /> : <StatusGlyph />}
            value={ticket.status}
            disabled={locked}
            onChange={(value) =>
              run(() => setStatusAction({ id: ticket.id, status: value as TicketStatus }))
            }
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option
                key={value}
                value={value}
                disabled={!canMoveTo(ticket.status, value as TicketStatus)}
              >
                {label}
              </option>
            ))}
          </BadgeSelect>

          <BadgeSelect
            label={`${UI_LABELS.assignedTo}: ${owner?.name ?? 'Unassigned'}`}
            icon={
              owner ? (
                <span className="[&>span]:h-5 [&>span]:w-5 [&>span]:text-[9px]">
                  <Avatar name={owner.name} size="small" />
                </span>
              ) : (
                <PersonGlyph />
              )
            }
            value={ticket.assigneeId ?? ''}
            disabled={locked}
            onChange={(value) => run(() => assignAction({ id: ticket.id, userId: value || null }))}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </BadgeSelect>

          <BadgeSelect
            label={
              `${ticket.priority} priority. ` +
              (ticket.firstRespondedAt
                ? 'Priority. The first reply clock has already stopped, so only the resolution target moves.'
                : 'Priority. Changing it recalculates both targets from when the ticket arrived.')
            }
            icon={<FlagGlyph priority={ticket.priority} />}
            value={ticket.priority}
            disabled={locked}
            onChange={(value) =>
              run(() => setPriorityAction({ id: ticket.id, priority: value as Priority }))
            }
          >
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </BadgeSelect>

          <BadgeSelect
            label="Queue. The queue owns the targets, so moving the ticket recalculates them."
            icon={<QueueGlyph />}
            value={ticket.queueId}
            disabled={locked}
            onChange={(value) => run(() => moveQueueAction({ id: ticket.id, queueId: value }))}
          >
            {queues.map((queue) => (
              <option key={queue.id} value={queue.id}>
                {queue.name}
              </option>
            ))}
          </BadgeSelect>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--color-line)] pt-2.5 text-[12px] text-[var(--color-ink-muted)]">
          <div className="flex flex-wrap items-center gap-2">
            {timer}

            {loggedLabel ? (
              <span className={pill}>
                {loggedLabel}
                <IconButton
                  icon="history"
                  label={UI_LABELS.timeHistory}
                  onClick={() => timeDialog.current?.showModal()}
                />
              </span>
            ) : null}
          </div>
          <div className="flex items-center border-l border-[var(--color-line)] pl-3">
            <EngineeringBadge ticket={ticket} spaces={spaces} users={users} canManage={canManage} />
          </div>
          <div className="flex items-center border-l border-[var(--color-line)] pl-3">
            <RelatedBadge ticket={ticket} canManage={canManage} onError={setError} />
          </div>
        </div>

        <dialog
          ref={timeDialog}
          aria-labelledby="logged-time-title"
          className="popup-glass m-auto max-h-[80vh] w-[calc(100%-2rem)] max-w-2xl overflow-auto p-4 text-[var(--color-ink)]"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="logged-time-title" className="font-semibold">
              {UI_LABELS.timeHistory}
            </h2>
            <IconButton
              icon="close"
              label={UI_LABELS.close}
              onClick={() => timeDialog.current?.close()}
            />
          </div>
          {timeEntries}
        </dialog>
      </CardSection>
    </div>
  );
}

const pill =
  'inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-[12px] text-[var(--color-ink)]';

/** A value that is also its own control: an icon, then the current choice as a dropdown. */
function BadgeSelect({
  label,
  icon,
  value,
  disabled,
  onChange,
  children,
  iconOnly = false,
}: {
  iconOnly?: boolean;
  label: string;
  icon: ReactNode;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label
      title={label}
      className={clsx(
        pill,
        iconOnly && 'relative',
        !disabled && 'cursor-pointer hover:border-[var(--color-line-strong)]',
      )}
    >
      {icon}
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={clsx(
          'cursor-[inherit] bg-transparent outline-none disabled:opacity-100',
          iconOnly
            ? 'absolute inset-0 h-full w-full opacity-0'
            : 'max-w-40 truncate [field-sizing:content]',
        )}
      >
        {children}
      </select>
    </label>
  );
}

/** A small read only value, or a button when it can be opened. */
function Badge({
  icon,
  label,
  children,
  onClick,
  pressed,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  onClick?: () => void;
  pressed?: boolean;
}) {
  const content = (
    <>
      {icon}
      <span className="tabular-nums">{children}</span>
    </>
  );

  return onClick ? (
    <button
      type="button"
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={clsx(
        pill,
        'hover:border-[var(--color-line-strong)]',
        pressed && 'border-[var(--color-line-strong)]',
      )}
    >
      {content}
    </button>
  ) : (
    <span title={label} className={pill}>
      {content}
    </span>
  );
}

const glyph = {
  width: 14,
  height: 14,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  className: 'shrink-0 text-[var(--color-ink-subtle)]',
};

function StatusGlyph() {
  return (
    <svg {...glyph}>
      <circle cx="8" cy="8" r="5.5" />
      <path d="m5.6 8.2 1.7 1.7 3.2-3.4" />
    </svg>
  );
}

function PersonGlyph() {
  return (
    <svg {...glyph}>
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M3 13c.7-2.4 2.6-3.5 5-3.5s4.3 1.1 5 3.5" />
    </svg>
  );
}

function FlagGlyph({ priority }: { priority: Priority }) {
  return (
    <svg {...glyph} className="shrink-0" style={{ color: `var(--color-priority-${priority})` }}>
      <path d="M4 14V2.5M4 3h7l-1.5 2.5L11 8H4" />
    </svg>
  );
}

function QueueGlyph() {
  return (
    <svg {...glyph}>
      <path d="M2.5 9.5 4 3.5h8l1.5 6M2.5 9.5v3h11v-3M2.5 9.5h3.2l.8 1.5h3l.8-1.5h3.2" />
    </svg>
  );
}

function EngineeringGlyph() {
  return (
    <svg {...glyph}>
      <path d="m5.5 5-3 3 3 3M10.5 5l3 3-3 3M9 3.5 7 12.5" />
    </svg>
  );
}

function LinkGlyph() {
  return (
    <svg {...glyph}>
      <path d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2-2a2.6 2.6 0 0 0-3.7-3.7l-.6.6M9.2 6.8a2.6 2.6 0 0 0-3.7 0l-2 2a2.6 2.6 0 0 0 3.7 3.7l.6-.6" />
    </svg>
  );
}

/** A form in a popup over the page, so opening it never moves what is below. */
function Popup({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={UI_LABELS.close}
        onClick={onClose}
        className="popup-backdrop absolute inset-0"
      />
      <div className="popup-glass relative w-full max-w-sm space-y-3 p-4">
        <h2 className="font-medium text-[var(--color-ink)]">{title}</h2>
        {children}
      </div>
    </div>
  );
}

/** Support answers questions; engineering changes software. Escalation is where that line is. */
function EngineeringBadge({
  ticket,
  spaces,
  users,
  canManage,
}: {
  ticket: TicketProperties;
  spaces: { id: string; name: string }[];
  users: { id: string; name: string }[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (previous: SupportFormState, formData: FormData) => {
      const result = await escalateAction(previous, formData);
      return result;
    },
    initialState,
  );

  if (ticket.escalatedTaskId) {
    return (
      <span title="This ticket was escalated to engineering as a task" className={pill}>
        <EngineeringGlyph />
        <Link
          href={`/tasks/${ticket.escalatedTaskId}`}
          className="font-medium underline underline-offset-4"
        >
          {ticket.escalatedTaskNumber ?? 'Linked task'}
        </Link>
        <DeskTaskButton taskId={ticket.escalatedTaskId} />
      </span>
    );
  }

  if (!canManage || ticket.isMerged || spaces.length === 0) return null;

  return (
    <>
      <Badge
        icon={<EngineeringGlyph />}
        label="Needs a code change rather than an answer: escalate it to a task"
        onClick={() => setOpen(true)}
      >
        Escalate
      </Badge>

      {open ? (
        <Popup title="Escalate to a task" onClose={() => setOpen(false)}>
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="ticketId" value={ticket.id} />

            <Field label="Space">
              <Select name="spaceId" required defaultValue={spaces[0]?.id}>
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Task title" hint="Leave empty to use the ticket number and subject">
              <Input name="title" />
            </Field>

            <Field label="Assign to">
              <Select name="assigneeIds" defaultValue="">
                <option value="">Nobody yet</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </Select>
            </Field>

            {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                {UI_LABELS.cancel}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? 'Escalating' : 'Create task'}
              </Button>
            </div>
          </form>
        </Popup>
      ) : null}
    </>
  );
}

/**
 * Duplicates and relatives.
 *
 * Merging moves the conversation onto the survivor and leaves the merged ticket pointing at it,
 * because its number was quoted in an email once. Linking is symmetric and changes nothing else.
 */
function RelatedBadge({
  ticket,
  canManage,
  onError,
}: {
  ticket: TicketProperties;
  canManage: boolean;
  onError: (message: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'list' | 'link' | 'merge'>('list');
  const [linkState, linkFormAction, linking] = useActionState(linkAction, initialState);
  const [mergeState, mergeFormAction, merging] = useActionState(mergeAction, initialState);
  const [, startTransition] = useTransition();

  const count = ticket.linkedTickets.length;
  if (!canManage && count === 0) return null;

  function close() {
    setOpen(false);
    setMode('list');
  }

  return (
    <>
      <Badge
        icon={<LinkGlyph />}
        label="Related tickets: linked tickets, and merging a duplicate away"
        onClick={() => setOpen(true)}
      >
        {count > 0 ? `${count} related` : 'Related'}
      </Badge>

      {open ? (
        <Popup title="Related tickets" onClose={close}>
          {mode === 'list' ? (
            <>
              {count > 0 ? (
                <ul className="space-y-1.5">
                  {ticket.linkedTickets.map((related) => (
                    <li key={related.id} className="flex items-center gap-2 text-sm">
                      <Link
                        href={`/support/tickets/${related.id}`}
                        className="min-w-0 flex-1 truncate text-[var(--color-ink)] underline-offset-4 hover:underline"
                      >
                        <span className="font-mono text-[11px] text-[var(--color-ink-subtle)]">
                          {related.number}
                        </span>{' '}
                        {related.subject}
                      </Link>

                      {canManage && !ticket.isMerged ? (
                        <IconButton
                          icon="unlink"
                          label="Unlink this ticket"
                          tone="danger"
                          type="button"
                          onClick={() => {
                            onError(null);
                            startTransition(async () => {
                              const result = await unlinkAction({
                                id: ticket.id,
                                otherId: related.id,
                              });
                              if (result.error) onError(result.error);
                            });
                          }}
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--color-ink-muted)]">Nothing linked yet.</p>
              )}

              {canManage && !ticket.isMerged ? (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setMode('link')}>
                    Link a ticket
                  </Button>
                  <Button variant="secondary" onClick={() => setMode('merge')}>
                    Merge away
                  </Button>
                </div>
              ) : null}
            </>
          ) : mode === 'link' ? (
            <form action={linkFormAction} className="space-y-2">
              <input type="hidden" name="ticketId" value={ticket.id} />

              <Field label="Link to">
                <TicketPicker
                  name="otherId"
                  excludeId={ticket.id}
                  label="Search by number or subject"
                />
              </Field>

              {linkState.error ? <Notice tone="alert">{linkState.error}</Notice> : null}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setMode('list')}>
                  Back
                </Button>
                <Button type="submit" disabled={linking}>
                  {linking ? 'Linking' : 'Link'}
                </Button>
              </div>
            </form>
          ) : (
            <form action={mergeFormAction} className="space-y-2">
              <input type="hidden" name="sourceId" value={ticket.id} />

              <Field
                label="Merge this ticket into"
                hint="This conversation moves there and this ticket closes, pointing at it."
              >
                <TicketPicker
                  name="targetId"
                  excludeId={ticket.id}
                  label="Search by number or subject"
                />
              </Field>

              {mergeState.error ? <Notice tone="alert">{mergeState.error}</Notice> : null}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setMode('list')}>
                  Back
                </Button>
                <Button type="submit" disabled={merging}>
                  {merging ? 'Merging' : 'Merge'}
                </Button>
              </div>
            </form>
          )}
        </Popup>
      ) : null}
    </>
  );
}
