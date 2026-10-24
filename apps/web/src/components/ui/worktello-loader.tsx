/** Shared streaming fallback: each whole bar lights up in turn through the three folds of the handoff W. */
export function WorktelloLoader({ variant = 'highlight' }: { variant?: 'highlight' | 'build' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`worktello-loading${variant === 'build' ? ' worktello-loading--build' : ''}`}
    >
      <span className="worktello-loading-mark" aria-hidden="true">
        <span className="worktello-loading-fold" />
        <span className="worktello-loading-fold" />
        <span className="worktello-loading-fold" />
      </span>
      <span className="worktello-loading-name" aria-hidden="true" />
      <span className="worktello-loading-label">Loading your workspace…</span>
    </div>
  );
}
