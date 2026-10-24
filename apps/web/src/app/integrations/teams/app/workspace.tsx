'use client';
import { TeamsShare } from '@/components/tasks/teams-share';
import { useCallback, useEffect, useRef, useState } from 'react';
import { TaskControls, type TeamsTimeEntry } from './task-controls';
import { BrandLogo } from '@/components/brand-logo';
import { TeamsCreateForm } from '../create/create-form';
import { teamsTabRequest } from '@/modules/integrations/teams/tab-client';

type Task = {
  id: string;
  number: string;
  title: string;
  status: string;
  priority: string;
  spaceName: string;
  folderName: string | null;
  endAt: string | null;
  isOverdue: boolean;
  subtasksDone: number;
  subtaskCount: number;
  assigneeIds: string[];
  assigneeNames: string[];
};
type Timer = { entryId: string; itemTitle: string; startedAt: string };
type Access = {
  actorId: string;
  canViewOthers: boolean;
  canAssignOthers: boolean;
  people: { id: string; name: string }[];
  runningTimer: Timer | null;
};
type Detail = {
  canAssignOthers: boolean;
  assignmentPeople: { id: string; name: string }[];
  timeEntries: TeamsTimeEntry[];
  runningTimer: Timer | null;
  task: {
    id: string;
    number: string;
    title: string;
    description: string | null;
    status: string;
    assigneeIds: string[];
    sourceTeamsMessageUrl?: string | null;
  };
  comments: {
    id: string;
    body: string;
    authorName: string;
    createdAt: string;
    attachments: { id: string; fileName: string }[];
  }[];
};
const button =
  'rounded-lg border border-[var(--color-line-strong)] px-3 py-2 text-sm disabled:opacity-50';
const control = 'rounded-lg border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-2';
const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Unable to load Worktello. Try reopening it in Teams.';

export function TeamsWorkspace() {
  const [access, setAccess] = useState<Access | null>(null);
  const [agents, setAgents] = useState<string[]>([]);
  const [timer, setTimer] = useState<Timer | null>(null);
  const [ready, setReady] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [mode, setMode] = useState<'tasks' | 'create' | 'detail'>('tasks');
  const [work, setWork] = useState('active');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [body, setBody] = useState('');
  const [shown, setShown] = useState(10);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError('');
    try {
      const result = await teamsTabRequest<Access & { tasks: Task[] }>(
        `action=list&work=${work}${agents.length ? '&agents=' + agents.join(',') : ''}`,
      );
      if (current === generation.current) {
        setTasks(result.tasks);
        setAccess(result);
        setTimer(result.runningTimer);
      }
    } catch (cause) {
      if (current === generation.current) {
        setError(message(cause));
        setTasks([]);
      }
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [work, agents]);
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const teams = await import('@microsoft/teams-js');
        await teams.app.initialize();
        teams.app.notifySuccess();
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) {
          setError('Open this screen from the Worktello app inside Microsoft Teams.');
          setLoading(false);
        }
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [ready, load]);
  async function open(id: string) {
    setSelectedId(id);
    const current = ++generation.current;
    setMode('detail');
    setLoading(true);
    setError('');
    setDetail(null);
    setShown(10);
    setBody('');
    try {
      const result = await teamsTabRequest<Detail>(`action=detail&taskId=${id}`);
      if (current === generation.current) {
        setDetail(result);
        setTimer(result.runningTimer);
      }
    } catch (cause) {
      if (current === generation.current) setError(message(cause));
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  async function external(path: string) {
    const teams = await import('@microsoft/teams-js');
    try {
      await teams.app.openLink(window.location.origin + path);
    } catch {
      setError('Unable to open Worktello. Open coex.digisol.ae in your browser.');
    }
  }
  const filtered = tasks.filter((task) =>
    `${task.number} ${task.title} ${task.spaceName}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <main className="mx-auto min-h-screen max-w-5xl p-4 text-[var(--color-ink)] sm:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <BrandLogo className="h-8 w-36" />
        <div className="flex flex-wrap gap-2">
          <button
            className={button}
            disabled={!ready || posting}
            onClick={() => {
              setMode('tasks');
              setDetail(null);
              void load();
            }}
          >
            Tasks
          </button>
          <button
            className={button}
            disabled={!ready}
            onClick={() => {
              generation.current++;
              setError('');
              setMode('create');
            }}
          >
            Create task
          </button>
          <button className={button} onClick={() => void external('/tasks?mine=1')}>
            Open full Worktello ↗
          </button>
        </div>
      </header>
      {timer && (
        <div role="status" className="mb-4 flex flex-wrap items-center gap-3">
          <span>
            Your timer: {timer.itemTitle} · started {new Date(timer.startedAt).toLocaleTimeString()}
          </span>
          <button
            className={button}
            disabled={posting}
            onClick={async () => {
              setPosting(true);
              setError('');
              try {
                await teamsTabRequest('timerStop', {});
                setTimer(null);
                if (mode === 'detail') await open(selectedId);
                else await load();
              } catch (cause) {
                setError(message(cause));
              } finally {
                setPosting(false);
              }
            }}
          >
            Stop my timer
          </button>
        </div>
      )}
      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-400 p-3">
          <p>{error}</p>
          <button
            className={button + ' mt-2'}
            onClick={() => (mode === 'detail' && selectedId ? void open(selectedId) : void load())}
          >
            Try again
          </button>
        </div>
      )}
      {mode === 'create' ? (
        <TeamsCreateForm personal onCreated={(id) => void open(id)} />
      ) : mode === 'detail' ? (
        <>
          {loading && <p role="status">Loading task…</p>}
          {detail && (
            <article>
              <p className="text-sm opacity-70">
                {detail.task.number} · {detail.task.status}
              </p>
              <h1 className="my-2 text-2xl font-semibold">{detail.task.title}</h1>
              <p className="mb-5 whitespace-pre-wrap break-words">{detail.task.description}</p>
              <button className={button} onClick={() => void external('/tasks/' + detail.task.id)}>
                Open attachments and full task ↗
              </button>
              <TeamsShare
                key={`share-${detail.task.id}`}
                task={detail.task}
                description={detail.task.description}
                source={detail.task.sourceTeamsMessageUrl}
                inTeams
              />
              <TaskControls
                key={detail.task.id}
                taskId={detail.task.id}
                assigneeIds={detail.task.assigneeIds}
                people={detail.assignmentPeople}
                canAssign={detail.canAssignOthers}
                entries={detail.timeEntries}
                onChanged={() => open(detail.task.id)}
              />
              <h2 className="mb-3 mt-6 text-lg font-semibold">Updates</h2>
              <form
                className="mb-5 space-y-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (posting || !body.trim()) return;
                  setPosting(true);
                  setError('');
                  try {
                    await teamsTabRequest('comment', { taskId: detail.task.id, body });
                    setBody('');
                    await open(detail.task.id);
                  } catch (cause) {
                    setError(message(cause) + ' Check updates before posting again.');
                  } finally {
                    setPosting(false);
                  }
                }}
              >
                <label className="block text-sm" htmlFor="teams-update">
                  Write an update
                </label>
                <textarea
                  id="teams-update"
                  className={control + ' min-h-24 w-full'}
                  maxLength={4000}
                  required
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                />
                <button className={button} disabled={posting || !body.trim()}>
                  {posting ? 'Posting…' : 'Post update'}
                </button>
              </form>
              {!detail.comments.length && <p>No updates yet.</p>}
              <ol className="space-y-3">
                {detail.comments.slice(0, shown).map((comment) => (
                  <li
                    key={comment.id}
                    className="rounded-xl border border-[var(--color-line-strong)] p-4"
                  >
                    <p className="mb-2 text-sm opacity-70">
                      {comment.authorName} · {new Date(comment.createdAt).toLocaleString()}
                    </p>
                    <p className="whitespace-pre-wrap break-words">{comment.body}</p>
                    {comment.attachments.length > 0 && (
                      <button
                        className={button + ' mt-2'}
                        onClick={() => void external('/tasks/' + detail.task.id)}
                      >
                        {comment.attachments.length} attachment(s) — open in Worktello ↗
                      </button>
                    )}
                  </li>
                ))}
              </ol>
              {shown < detail.comments.length && (
                <button
                  className={button + ' mt-4'}
                  onClick={() => setShown((value) => value + 10)}
                >
                  Show more
                </button>
              )}
            </article>
          )}
        </>
      ) : (
        <>
          <h1 className="mb-4 text-2xl font-semibold">
            {agents.some((id) => id !== access?.actorId) ? 'Agent tasks' : 'My Tasks'}
          </h1>
          {access?.canViewOthers && (
            <fieldset className="mb-4 flex flex-wrap gap-3">
              <legend>View agents’ tasks</legend>
              {access.people.map((person) => (
                <label key={person.id} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={(agents.length ? agents : [access.actorId]).includes(person.id)}
                    onChange={(event) => {
                      const current = agents.length ? agents : [access.actorId];
                      const next = event.target.checked
                        ? [...current, person.id]
                        : current.filter((id) => id !== person.id);
                      setAgents(next.length ? next : [access.actorId]);
                      setWork('all');
                    }}
                  />
                  {person.name}
                </label>
              ))}
            </fieldset>
          )}
          <div className="mb-4 flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="teams-search">
              Search tasks
            </label>
            <input
              id="teams-search"
              className={control + ' min-w-0 flex-1'}
              placeholder="Search your tasks…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <label className="sr-only" htmlFor="teams-filter">
              Personal work
            </label>
            <select
              id="teams-filter"
              className={control}
              disabled={agents.some((id) => id !== access?.actorId)}
              value={work}
              onChange={(event) => setWork(event.target.value)}
            >
              <option value="active">Active work</option>
              <option value="done">My subtask done</option>
              <option value="all">All my open tasks</option>
            </select>
            <button className={button} disabled={loading || !ready} onClick={() => void load()}>
              Refresh
            </button>
          </div>
          {loading ? (
            <p role="status">Loading your tasks…</p>
          ) : !error && !filtered.length ? (
            <p>No tasks in this view.</p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((task) => (
                <li
                  key={task.id}
                  className="rounded-xl border border-[var(--color-line-strong)] p-4"
                >
                  <button
                    className="text-left font-semibold hover:underline"
                    onClick={() => void open(task.id)}
                  >
                    {task.number} · {task.title}
                  </button>
                  <p className="mt-1 text-sm opacity-70">
                    {task.spaceName}
                    {task.folderName ? ` / ${task.folderName}` : ''} · {task.status} ·{' '}
                    {task.priority}
                  </p>
                  <p className="text-sm">{task.assigneeNames.join(', ')}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>
                      {task.endAt
                        ? `Due ${new Date(task.endAt).toLocaleDateString()}`
                        : 'No due date'}
                      {task.isOverdue ? ' · Overdue' : ''}
                      {task.subtaskCount
                        ? ` · Subtasks ${task.subtasksDone}/${task.subtaskCount}`
                        : ''}
                    </span>
                    {work !== 'all' && task.assigneeIds.includes(access?.actorId ?? '') && (
                      <button
                        className={button}
                        disabled={posting}
                        onClick={async () => {
                          setPosting(true);
                          setError('');
                          try {
                            await teamsTabRequest('personalDone', {
                              taskId: task.id,
                              done: work !== 'done',
                            });
                            await load();
                          } catch (cause) {
                            setError(message(cause));
                          } finally {
                            setPosting(false);
                          }
                        }}
                      >
                        {work === 'done' ? 'Restore to active' : 'My subtask done'}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
