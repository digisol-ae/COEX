'use client';

import { useActionState, useState } from 'react';
import { Badge, Button, Card, CardSection, Field, Input, Notice, Select } from '@/components/ui';
import { Avatar } from '@/components/ui/avatar';
import { formatWorkingMinutes } from '@/modules/tickets/business-hours';
import type { QueueSummary } from '@/modules/tickets/services/queue.service';
import {
  archiveQueueAction,
  restoreQueueAction,
  saveQueueAction,
  type SupportFormState,
} from '../../support/actions';

const initialState: SupportFormState = {};

const PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const;

export function QueueList({
  queues,
  users,
  products,
}: {
  queues: QueueSummary[];
  users: { id: string; name: string }[];
  products: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {editing === 'new' ? (
        <QueueForm
          users={users}
          products={products}
          onClose={() => setEditing(null)}
          isOnlyQueue={queues.length === 0}
        />
      ) : (
        <Button onClick={() => setEditing('new')}>Add queue</Button>
      )}

      {queues.map((queue) =>
        editing === queue.id ? (
          <QueueForm
            key={queue.id}
            queue={queue}
            users={users}
            products={products}
            onClose={() => setEditing(null)}
            isOnlyQueue={queues.filter((candidate) => !candidate.isArchived).length <= 1}
          />
        ) : (
          <Card key={queue.id}>
            <CardSection>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium text-[var(--color-ink)]">{queue.name}</h3>
                    {queue.isDefault ? <Badge tone="info">Default</Badge> : null}
                    {queue.isArchived ? <Badge tone="neutral">Archived</Badge> : null}
                    <span className="text-[11px] text-[var(--color-ink-subtle)]">
                      {queue.openTicketCount} open
                    </span>
                  </div>

                  {queue.description ? (
                    <p className="mt-1 text-[13px] text-[var(--color-ink-muted)]">
                      {queue.description}
                    </p>
                  ) : null}

                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] sm:grid-cols-4">
                    {queue.targets.map((target) => (
                      <div key={target.priority}>
                        <dt className="text-[var(--color-ink-subtle)] capitalize">
                          {target.priority}
                        </dt>
                        <dd className="text-[var(--color-ink-muted)] tabular-nums">
                          {formatWorkingMinutes(target.firstResponseMinutes)} reply,{' '}
                          {formatWorkingMinutes(target.resolutionMinutes)} resolve
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {queue.memberNames.length > 0 ? (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[11px] text-[var(--color-ink-subtle)]">Members</span>
                      <span className="flex -space-x-1.5">
                        {queue.memberNames.map((name) => (
                          <Avatar key={name} name={name} size="small" />
                        ))}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setEditing(queue.id)}>
                    Edit
                  </Button>

                  <form action={queue.isArchived ? restoreQueueAction : archiveQueueAction}>
                    <input type="hidden" name="id" value={queue.id} />
                    <Button type="submit" variant="secondary">
                      {queue.isArchived ? 'Restore' : 'Archive'}
                    </Button>
                  </form>
                </div>
              </div>
            </CardSection>
          </Card>
        ),
      )}
    </div>
  );
}

/**
 * The queue form.
 *
 * Targets are entered in hours because that is how promises are made in a contract, and stored as
 * working minutes because that is how they are measured. The service refuses a resolution target
 * shorter than its own first response target, which is the mistake people actually make.
 */
function QueueForm({
  queue,
  users,
  products,
  onClose,
  isOnlyQueue,
}: {
  queue?: QueueSummary;
  users: { id: string; name: string }[];
  products: { id: string; name: string }[];
  onClose: () => void;
  isOnlyQueue: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveQueueAction, initialState);

  const targetOf = (priority: string) =>
    queue?.targets.find((target) => target.priority === priority);

  return (
    <Card>
      <CardSection title={queue ? `Edit ${queue.name}` : 'New queue'}>
        <form action={formAction} className="space-y-3">
          {queue ? <input type="hidden" name="id" value={queue.id} /> : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input name="name" required defaultValue={queue?.name} autoFocus />
            </Field>

            <Field label="Product" hint="Optional, when a queue serves one product">
              <Select name="productId" defaultValue={queue?.productId ?? ''}>
                <option value="">Any product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Description">
            <Input name="description" defaultValue={queue?.description ?? ''} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Members" hint="Hold command to choose several">
              <select
                name="memberIds"
                multiple
                defaultValue={queue?.memberIds ?? []}
                className="h-28 w-full rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-ink)]"
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Default owner" hint="Who picks up a ticket nobody claimed">
              <Select name="defaultAssigneeId" defaultValue={queue?.defaultAssigneeId ?? ''}>
                <option value="">Nobody</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Signature" hint="Appended by {{signature}} in a saved reply">
            <Input name="signature" defaultValue={queue?.signature ?? ''} />
          </Field>

          <fieldset className="rounded-[var(--radius-control)] border border-[var(--color-line)] p-3">
            <legend className="px-1 text-[11px] tracking-wide text-[var(--color-ink-subtle)] uppercase">
              Targets in working hours
            </legend>

            <div className="grid gap-2 sm:grid-cols-2">
              {PRIORITIES.map((priority) => (
                <div key={priority} className="flex items-end gap-2">
                  <span className="w-16 pb-2 text-[12px] text-[var(--color-ink-muted)] capitalize">
                    {priority}
                  </span>

                  <Field label="Reply">
                    <Input
                      name={`${priority}_first`}
                      type="number"
                      step="0.5"
                      min="0.5"
                      required
                      defaultValue={(targetOf(priority)?.firstResponseMinutes ?? 240) / 60}
                    />
                  </Field>

                  <Field label="Resolve">
                    <Input
                      name={`${priority}_resolve`}
                      type="number"
                      step="0.5"
                      min="0.5"
                      required
                      defaultValue={(targetOf(priority)?.resolutionMinutes ?? 1440) / 60}
                    />
                  </Field>
                </div>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center gap-2 text-[13px] text-[var(--color-ink-muted)]">
            <input
              type="checkbox"
              name="isDefault"
              defaultChecked={queue?.isDefault || isOnlyQueue}
              className="h-3.5 w-3.5"
            />
            Tickets with no queue land here
          </label>

          {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving' : 'Save queue'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </form>
      </CardSection>
    </Card>
  );
}
