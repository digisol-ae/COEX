import Link from 'next/link';

/**
 * Where you are, and one click back.
 *
 * A project screen reached from a tree in the sidebar loses its context the moment the tree
 * scrolls, so the trail repeats it above the title. It replaces a "Back" link because a trail
 * answers both questions at once: where am I, and what is this inside.
 */
export function Breadcrumb({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-[12px] text-[var(--color-ink-subtle)]">
        {trail.map((step, index) => (
          <li key={`${step.label}-${index}`} className="flex items-center gap-1">
            {index > 0 ? (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M4.5 2.5L8 6l-3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}

            {step.href ? (
              <Link
                href={step.href}
                className="rounded px-1 py-0.5 transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
              >
                {step.label}
              </Link>
            ) : (
              <span className="px-1 py-0.5 text-[var(--color-ink-muted)]">{step.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
