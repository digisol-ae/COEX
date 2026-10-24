'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BrandLogo } from '@/components/brand-logo';
import { teamsTabRequest } from '@/modules/integrations/teams/tab-client';
import { TASK_TIME_ZONE } from '@coex/shared/tasks/dates';
import {
  defaultAssignee,
  formChoices,
  type TeamsFormData,
} from '@/modules/integrations/teams/form-model';

export function TeamsCreateForm({
  personal = false,
  onCreated,
}: {
  personal?: boolean;
  onCreated?: (id: string) => void;
}) {
  const requestId = useRef('');
  const tokenRef = useRef('');
  const [data, setData] = useState<TeamsFormData | null>(null);
  const [draft, setDraft] = useState('');
  const [space, setSpace] = useState('');
  const [folder, setFolder] = useState('');
  const [assignee, setFirstAssignee] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[] | null>(null);
  function setAssignee(value: string) {
    setFirstAssignee(value);
    setSelectedAgents(null);
  }
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const token =
      tokenRef.current || new URLSearchParams(window.location.hash.slice(1)).get('draft') || '';
    tokenRef.current = token;
    // Fragments are not sent to HTTP servers or in referrers; remove it from browser history too.
    if (!personal) window.history.replaceState(null, '', window.location.pathname);
    if (!token && !personal) {
      setError('Open Create Worktello task from a Teams message.');
      return;
    }
    setDraft(token);
    async function load() {
      try {
        const teams = await import('@microsoft/teams-js');
        await teams.app.initialize();
        if (controller.signal.aborted) return;
        setReady(true);
        if (personal) {
          const choices = await teamsTabRequest<TeamsFormData>('action=form');
          if (controller.signal.aborted) return;
          setData(choices);
          const initial = choices.spaces[0]?.id ?? '';
          setSpace(initial);
          setAssignee(defaultAssignee(choices, initial, ''));
          requestId.current = crypto.randomUUID();
          return;
        }
        const response = await fetch('/api/integrations/teams/form', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft: token }),
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error('This form expired or your access changed. Open a new form from Teams.');
        const choices = (await response.json()) as TeamsFormData;
        setData(choices);
        const initial = choices.spaces[0]?.id ?? '';
        setSpace(initial);
        setAssignee(defaultAssignee(choices, initial, ''));
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to open the form. Try again from Teams.',
          );
      }
    }
    void load();
    return () => controller.abort();
  }, [personal]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !ready || submitting) return;
    const fields = new FormData(event.currentTarget);
    if (fields.get('dueTime') && !fields.get('dueDate')) {
      setError('Choose a date with the time.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      if (personal) {
        const result = await teamsTabRequest<{ taskId: string }>('create', {
          requestId: requestId.current,
          fields: { ...Object.fromEntries(fields), spaceId: space, folderId: folder, assignee },
          assigneeIds: selectedAgents ?? (assignee ? [assignee] : []),
        });
        if (data.canViewOthers || (selectedAgents ?? [assignee]).includes(data.actorId))
          onCreated?.(result.taskId);
        else setCreated(true);
        return;
      }
      const teams = await import('@microsoft/teams-js');
      teams.dialog.url.submit(
        { ...Object.fromEntries(fields), draft, spaceId: space, folderId: folder, assignee },
        data.appId,
      );
    } catch (cause) {
      setSubmitting(false);
      setError(
        personal && cause instanceof Error
          ? cause.message
          : 'Could not submit. Check your task list before trying again.',
      );
    }
  }

  const choices = data ? formChoices(data, space, folder) : { folders: [], people: [] };
  const control =
    'mt-1 w-full rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)]';
  const Container = personal ? 'section' : 'main';
  return (
    <Container
      className={
        personal
          ? 'max-w-3xl text-[var(--color-ink)]'
          : 'mx-auto max-w-3xl p-5 text-[var(--color-ink)]'
      }
    >
      {!personal && <BrandLogo className="mb-4 h-8 w-auto" />}
      <h1 className="mb-4 text-xl font-semibold">Create Worktello task</h1>
      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-red-400 p-3 text-sm">
          {error}
        </p>
      ) : null}
      {created ? (
        <p role="status">Task created successfully. Select Tasks to return to your work.</p>
      ) : !data ? (
        <p className="text-sm" aria-live="polite">
          {error
            ? personal
              ? 'Return to My Tasks and reopen Create task when ready.'
              : 'Close this window and reopen the action when ready.'
            : 'Loading your workspace…'}
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm">
            Title
            <input
              name="title"
              required
              maxLength={250}
              defaultValue={data.title}
              className={control}
            />
          </label>
          <label className="block text-sm">
            Description
            <textarea
              name="description"
              rows={3}
              maxLength={12000}
              defaultValue={data.description}
              className={control}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              Choose space
              <select
                required
                value={space}
                className={control}
                onChange={(e) => {
                  setSpace(e.target.value);
                  setFolder('');
                  setAssignee(defaultAssignee(data, e.target.value, ''));
                }}
              >
                <option value="">Choose space</option>
                {data.spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Choose folder
              <select
                disabled={!space}
                value={folder}
                className={control}
                onChange={(e) => {
                  setFolder(e.target.value);
                  setAssignee(defaultAssignee(data, space, e.target.value));
                }}
              >
                <option value="">No folder</option>
                {choices.folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {personal && data.canAssignOthers ? (
              <fieldset className="space-y-2 text-sm">
                <legend>Assign agents</legend>
                {choices.people.map((person) => (
                  <label key={person.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(selectedAgents ?? (assignee ? [assignee] : [])).includes(person.id)}
                      onChange={(event) => {
                        const current = selectedAgents ?? (assignee ? [assignee] : []);
                        setSelectedAgents(
                          event.target.checked
                            ? [...current, person.id]
                            : current.filter((id) => id !== person.id),
                        );
                      }}
                    />
                    {person.name}
                  </label>
                ))}
              </fieldset>
            ) : (
              <label className="block text-sm">
                Choose assignee
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className={control}
                >
                  {data.canAssignOthers && <option value="">Unassigned</option>}
                  {choices.people
                    .filter((p) => data.canAssignOthers || p.id === data.actorId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.id === data.actorId ? ' (you)' : ''}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <label className="block text-sm">
              Priority
              <select name="priority" defaultValue="normal" className={control}>
                {['low', 'normal', 'high', 'urgent'].map((p) => (
                  <option key={p} value={p}>
                    {p[0].toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Choose date
              <input type="date" name="dueDate" className={control} />
            </label>
            <label className="block text-sm">
              Choose time
              <input type="time" name="dueTime" className={control} />
            </label>
          </div>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Due date and time use office time ({TASK_TIME_ZONE}).
            {!personal && ' The original Teams message link is saved with the task.'}
          </p>
          {!choices.people.some((p) => p.id === data.actorId) && space ? (
            <p className="text-xs">
              You cannot be assigned in this destination. Choose an eligible assignee or leave it
              unassigned.
            </p>
          ) : null}
          <button
            type="submit"
            disabled={!space || !ready || submitting}
            className="rounded-lg bg-[var(--color-action)] px-5 py-2 text-[var(--color-ink-inverse)] disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create task'}
          </button>
        </form>
      )}
    </Container>
  );
}
