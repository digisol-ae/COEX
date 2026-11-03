'use client';
import { useEffect, useState } from 'react';
import { Button, Field, Input, Select, Notice } from '@/components/ui';
import type { OutlookTaskInput } from '@/modules/integrations/outlook/protocol';
type Email = Pick<
  OutlookTaskInput,
  'messageId' | 'mailbox' | 'title' | 'body' | 'sender' | 'sentAt' | 'attachments'
>;
type Choices = {
  actorId: string;
  spaces: { id: string; name: string; memberIds: string[] }[];
  folders: { id: string; name: string; spaceId: string; memberIds: string[] }[];
  people: { id: string; name: string }[];
  customers: { id: string; name: string }[];
};
export function OutlookCreateForm({ allowSample = false }: { allowSample?: boolean }) {
  const [email, setEmail] = useState<Email | null>(null),
    [choices, setChoices] = useState<Choices | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<{
      taskId: string;
      duplicate: boolean;
      attachmentWarning: boolean;
    } | null>(null),
    [spaceId, setSpace] = useState(''),
    [folderId, setFolder] = useState('');
  async function load() {
    try {
      const response = await fetch('/api/integrations/outlook/tasks');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setChoices(data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load task choices.');
    }
  }
  useEffect(() => {
    let current = true;
    fetch('/api/integrations/outlook/tasks')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (current) setChoices(data);
      })
      .catch((error) => {
        if (current)
          setError(error instanceof Error ? error.message : 'Could not load task choices.');
      });
    return () => {
      current = false;
    };
  }, []);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== window.parent) return;
      try {
        const value = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (
          value.type === 'worktello-email' &&
          typeof value.email?.messageId === 'string' &&
          Array.isArray(value.email.attachments)
        )
          setEmail(value.email);
      } catch {
        setError('The email could not be read. Reopen the add-in.');
      }
    };
    window.addEventListener('message', receive);
    if (window.parent !== window)
      window.parent.postMessage('worktello-form-ready', location.origin);
    return () => window.removeEventListener('message', receive);
  }, []);
  const space = choices?.spaces.find((s) => s.id === spaceId),
    folder = choices?.folders.find((f) => f.id === folderId);
  const people =
    choices?.people.filter(
      (p) =>
        (!space?.memberIds.length || space.memberIds.includes(p.id)) &&
        (!folder?.memberIds.length || folder.memberIds.includes(p.id)),
    ) ?? [];
  return (
    <main className="mx-auto max-w-2xl space-y-5 p-6">
      <div>
        <p className="text-sm text-[var(--color-ink-subtle)]">Worktello · Outlook</p>
        <h1 className="text-2xl font-semibold">Create task from email</h1>
        <p className="mt-2 text-sm">
          Review the email and choose where the task belongs. Nothing is created until you save.
        </p>
      </div>
      {error ? (
        <Notice tone="alert">
          {error}{' '}
          <a href="/login" target="_blank" rel="noreferrer" className="underline">
            Sign in to Worktello
          </a>{' '}
          <Button onClick={load} variant="secondary">
            Retry
          </Button>
        </Notice>
      ) : null}
      {!email ? (
        <div className="space-y-3">
          <p>
            Open an email in Outlook and choose <strong>Create Worktello Task</strong>.
          </p>
          {allowSample ? (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setResult(null);
                  setEmail({
                    messageId: 'worktello-local-demo-email',
                    mailbox: 'feedback-admin@example.test',
                    title: '[QA] Follow up on customer request',
                    body: 'Synthetic email for local review. Please arrange a support follow-up.',
                    sender: 'QA Customer <person@qa-customer.test>',
                    sentAt: '27 October 2026',
                    attachments: [],
                  });
                }}
              >
                Try a sample email
              </Button>
              <p className="text-xs">The sample contains synthetic data only.</p>
            </>
          ) : null}
        </div>
      ) : result ? (
        <Notice tone="ok">
          {result.duplicate ? 'This email already has a task.' : 'Task created.'}{' '}
          <a
            className="underline"
            href={`/tasks/${result.taskId}`}
            target="_blank"
            rel="noreferrer"
          >
            Open task
          </a>
          {result.attachmentWarning ? (
            <p>Attachment import needs review. Open the task before retrying.</p>
          ) : null}
        </Notice>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!choices) return;
            setBusy(true);
            setError('');
            const form = new FormData(event.currentTarget);
            try {
              const response = await fetch('/api/integrations/outlook/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ...email,
                  title: form.get('title'),
                  body: form.get('body'),
                  spaceId,
                  folderId: folderId || null,
                  organisationId: form.get('organisationId') || null,
                  assigneeIds: form.getAll('assigneeIds'),
                  dueDate: form.get('dueDate'),
                  attachments: email.attachments.filter((_, index) =>
                    form.getAll('attachment').includes(String(index)),
                  ),
                }),
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.error);
              setResult(data);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Could not create task.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="text-sm">
            From: {email.sender}
            <br />
            Sent: {email.sentAt}
          </p>
          <Field label="Task title">
            <Input name="title" required maxLength={300} defaultValue={email.title} />
          </Field>
          <Field label="Description">
            <textarea
              name="body"
              maxLength={30000}
              defaultValue={email.body}
              rows={7}
              className="w-full rounded border border-[var(--color-line)] bg-[var(--color-surface)] p-3"
            />
          </Field>
          <Field label="Space / project">
            <Select
              required
              value={spaceId}
              onChange={(e) => {
                setSpace(e.target.value);
                setFolder('');
              }}
            >
              <option value="">Choose a space</option>
              {choices?.spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Folder">
            <Select value={folderId} onChange={(e) => setFolder(e.target.value)}>
              <option value="">No folder</option>
              {choices?.folders
                .filter((f) => f.spaceId === spaceId)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Customer">
            <Select name="organisationId">
              <option value="">Use space customer</option>
              {choices?.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <fieldset key={`${spaceId}:${folderId}`}>
            <legend className="text-sm font-medium">Assigned to</legend>
            {people.map((p) => (
              <label className="mr-4 inline-flex items-center gap-2 text-sm" key={p.id}>
                <input
                  type="checkbox"
                  name="assigneeIds"
                  value={p.id}
                  defaultChecked={p.id === choices?.actorId}
                />
                {p.name}
              </label>
            ))}
          </fieldset>
          <Field label="Due date">
            <Input type="date" name="dueDate" />
          </Field>
          {email.attachments.length ? (
            <fieldset>
              <legend>Attachments · up to 3MB each, 10MB total</legend>
              {email.attachments.map((file, index) => (
                <label className="flex gap-2" key={index}>
                  <input name="attachment" value={index} type="checkbox" defaultChecked />
                  {file.fileName}
                </label>
              ))}
            </fieldset>
          ) : (
            <p className="text-sm text-[var(--color-ink-subtle)]">No attachments selected.</p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create Worktello task'}
          </Button>
        </form>
      )}
    </main>
  );
}
