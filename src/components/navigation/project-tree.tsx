'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { clsx } from 'clsx';

/**
 * The project tree in the sidebar: project, then its tasks, then their subtasks.
 *
 * Everything loads on expand rather than with the page. A tenant with fifty projects and a
 * thousand tasks would otherwise pay for that on every screen, including the ones that never show
 * it, and the sidebar is the last place that should make a page feel slow.
 *
 * What has been fetched is kept for the rest of the visit, so opening a project twice costs one
 * request.
 */

interface TreeProject {
  id: string;
  name: string;
  openTaskCount: number;
}

interface TreeTask {
  id: string;
  number: string;
  title: string;
  isClosed: boolean;
  subtasks: { id: string; title: string; done: boolean }[];
}

export function ProjectTree() {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<TreeProject[] | null>(null);
  const [tasksByProject, setTasksByProject] = useState<Record<string, TreeTask[]>>({});
  const [expanded, setExpanded] = useState<string[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  async function toggleTree() {
    const next = !open;
    setOpen(next);

    if (next && projects === null) {
      setLoading('projects');

      try {
        const response = await fetch('/api/navigation/projects');
        const data = (await response.json()) as { projects?: TreeProject[] };
        setProjects(data.projects ?? []);
      } catch {
        // A failed fetch leaves the tree empty rather than breaking the sidebar around it.
        setProjects([]);
      } finally {
        setLoading(null);
      }
    }
  }

  async function toggleProject(projectId: string) {
    const isOpen = expanded.includes(projectId);

    setExpanded((current) =>
      isOpen ? current.filter((id) => id !== projectId) : [...current, projectId],
    );

    if (!isOpen && !tasksByProject[projectId]) {
      setLoading(projectId);

      try {
        const response = await fetch(`/api/navigation/projects/${projectId}/tasks`);
        const data = (await response.json()) as { tasks?: TreeTask[] };
        setTasksByProject((current) => ({ ...current, [projectId]: data.tasks ?? [] }));
      } catch {
        setTasksByProject((current) => ({ ...current, [projectId]: [] }));
      } finally {
        setLoading(null);
      }
    }
  }

  return (
    <div>
      <div className="flex items-center">
        <Link
          href="/projects"
          className={clsx(
            'flex-1 rounded-[var(--radius-control)] px-3 py-2.5 text-sm transition-colors',
            pathname.startsWith('/projects')
              ? 'bg-[var(--color-rail-raised)] font-medium text-[var(--color-rail-ink)]'
              : 'text-[var(--color-rail-ink-muted)] hover:bg-[var(--color-rail-raised)]/60 hover:text-[var(--color-rail-ink)]',
          )}
        >
          Projects
        </Link>

        <button
          type="button"
          onClick={toggleTree}
          aria-expanded={open}
          aria-label={open ? 'Hide the project list' : 'Show the project list'}
          className="flex h-8 w-7 items-center justify-center text-[var(--color-rail-ink-muted)] transition-colors hover:text-[var(--color-rail-ink)]"
        >
          <Chevron open={open} />
        </button>
      </div>

      {open ? (
        <div className="mt-0.5 ml-3 space-y-0.5 border-l border-[var(--color-rail-line)] pl-2">
          {loading === 'projects' ? <Loading /> : null}

          {projects?.length === 0 && loading !== 'projects' ? (
            <p className="px-2 py-1.5 text-xs text-[var(--color-rail-ink-muted)]">
              No projects yet
            </p>
          ) : null}

          {projects?.map((project) => {
            const projectOpen = expanded.includes(project.id);
            const tasks = tasksByProject[project.id];

            return (
              <div key={project.id}>
                <div className="flex items-center">
                  <Link
                    href={`/projects/${project.id}`}
                    className={clsx(
                      'min-w-0 flex-1 truncate rounded-[var(--radius-control)] px-2 py-1.5 text-xs transition-colors',
                      pathname === `/projects/${project.id}`
                        ? 'bg-[var(--color-rail-raised)] text-[var(--color-rail-ink)]'
                        : 'text-[var(--color-rail-ink-muted)] hover:text-[var(--color-rail-ink)]',
                    )}
                  >
                    {project.name}
                  </Link>

                  {project.openTaskCount > 0 ? (
                    <span className="px-1 text-[10px] text-[var(--color-rail-ink-muted)] tabular-nums">
                      {project.openTaskCount}
                    </span>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => toggleProject(project.id)}
                    aria-expanded={projectOpen}
                    aria-label={`${projectOpen ? 'Hide' : 'Show'} tasks in ${project.name}`}
                    className="flex h-6 w-5 items-center justify-center text-[var(--color-rail-ink-muted)] hover:text-[var(--color-rail-ink)]"
                  >
                    <Chevron open={projectOpen} small />
                  </button>
                </div>

                {projectOpen ? (
                  <div className="ml-2 space-y-0.5 border-l border-[var(--color-rail-line)] pl-2">
                    {loading === project.id ? <Loading /> : null}

                    {tasks?.length === 0 && loading !== project.id ? (
                      <p className="px-2 py-1 text-[11px] text-[var(--color-rail-ink-muted)]">
                        No tasks
                      </p>
                    ) : null}

                    {tasks?.map((task) => (
                      <div key={task.id}>
                        <Link
                          href={`/tasks/${task.id}`}
                          className={clsx(
                            'block truncate rounded-[var(--radius-control)] px-2 py-1 text-[11px] transition-colors hover:text-[var(--color-rail-ink)]',
                            task.isClosed
                              ? 'text-[var(--color-rail-ink-muted)] line-through'
                              : 'text-[var(--color-rail-ink-muted)]',
                            pathname === `/tasks/${task.id}` &&
                              'bg-[var(--color-rail-raised)] text-[var(--color-rail-ink)]',
                          )}
                        >
                          {task.title}
                        </Link>

                        {task.subtasks.length > 0 ? (
                          <div className="ml-2 border-l border-[var(--color-rail-line)] pl-2">
                            {task.subtasks.map((subtask) => (
                              <p
                                key={subtask.id}
                                className={clsx(
                                  'truncate px-2 py-0.5 text-[11px]',
                                  subtask.done
                                    ? 'text-[var(--color-rail-ink-muted)] line-through'
                                    : 'text-[var(--color-rail-ink-muted)]',
                                )}
                              >
                                {subtask.title}
                              </p>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Loading() {
  return <p className="px-2 py-1.5 text-xs text-[var(--color-rail-ink-muted)]">Loading</p>;
}

function Chevron({ open, small }: { open: boolean; small?: boolean }) {
  const size = small ? 10 : 12;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={clsx('transition-transform', open ? 'rotate-90' : 'rotate-0')}
    >
      <path
        d="M4.5 2.5L8 6l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
