'use client';

import { useActionState } from 'react';
import { Button, Card, CardSection, EmptyState, Field, Input, Notice } from '@/components/ui';
import { addDocumentAction, removeDocumentAction, type TaskFormState } from '../actions';

const initialState: TaskFormState = {};

/**
 * Links, not copies. The document stays in Microsoft 365 where SharePoint permissions decide who
 * may open it, and there is only ever one version of it.
 */
export function DocumentLinks({
  taskId,
  links,
  canManage,
}: {
  taskId: string;
  links: { id: string; url: string; title: string }[];
  canManage: boolean;
}) {
  const [state, formAction, pending] = useActionState(addDocumentAction, initialState);

  return (
    <Card>
      <CardSection title="Documents">
        {links.length === 0 ? (
          <EmptyState message="No documents linked. Paste a SharePoint, OneDrive or Teams link." />
        ) : (
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.id} className="flex items-center justify-between gap-3">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 truncate rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-ink)] shadow-sm transition-shadow duration-150 cursor-pointer hover:border-[var(--color-line-strong)] hover:shadow-md"
                >
                  {link.title}
                </a>

                {canManage ? (
                  <form action={removeDocumentAction}>
                    <input type="hidden" name="taskId" value={taskId} />
                    <input type="hidden" name="linkId" value={link.id} />
                    <button
                      type="submit"
                      className="text-xs text-[var(--color-ink-subtle)] underline-offset-4 hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canManage ? (
          <form action={formAction} className="mt-4 space-y-3">
            <input type="hidden" name="taskId" value={taskId} />

            <Field
              label="Link"
              hint="SharePoint, OneDrive or Teams only. The file stays where it is."
            >
              <Input name="url" placeholder="https://digisol.sharepoint.com/..." />
            </Field>

            <Field label="Name it" hint="Optional. Taken from the link if left empty.">
              <Input name="title" />
            </Field>

            {state.error ? <Notice tone="alert">{state.error}</Notice> : null}

            <Button type="submit" variant="secondary" disabled={pending}>
              {pending ? 'Adding' : 'Add link'}
            </Button>
          </form>
        ) : null}
      </CardSection>
    </Card>
  );
}
