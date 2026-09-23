/** A paperclip badge, shown on a task wherever it appears, when it carries a linked document. */
export function DocumentBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span
      title={count === 1 ? '1 document linked' : `${count} documents linked`}
      className="inline-flex items-center gap-0.5 rounded-[var(--radius-control)] bg-[var(--color-surface-sunken)] px-1.5 py-0.5 text-[11px] text-[var(--color-ink-muted)]"
    >
      <ClipIcon />
      {count > 1 ? count : null}
    </span>
  );
}

function ClipIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M8.5 3.5 4.7 7.3a1.6 1.6 0 0 0 2.26 2.26L10.5 6a2.6 2.6 0 1 0-3.68-3.68L3.3 5.86a3.4 3.4 0 0 0 4.81 4.81"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
