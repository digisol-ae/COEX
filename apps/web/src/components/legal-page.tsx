import Link from 'next/link';
import type { ReactNode } from 'react';

/** Public notices must remain readable without a COEX account or Teams session. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--color-surface)] px-5 py-8 text-[var(--color-ink)] sm:px-8 sm:py-12">
      <article className="mx-auto max-w-3xl">
        <header className="border-b border-[var(--color-line-strong)] pb-6">
          <p className="text-sm font-semibold text-[var(--color-ink-muted)]">COEX · DigiSol</p>
          <h1 className="mt-3 text-3xl font-bold">{title}</h1>
          <p className="mt-3 text-sm text-[var(--color-ink-muted)]">
            Effective date: 22 October 2026 · Last updated: 22 October 2026
          </p>
          <nav aria-label="Policy pages" className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm">
            <Link className="underline underline-offset-4" href="/privacy">
              Privacy Policy
            </Link>
            <Link className="underline underline-offset-4" href="/terms">
              Terms of Use
            </Link>
          </nav>
        </header>
        <div className="space-y-8 py-8 text-base leading-7 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_p+p]:mt-3 [&_a]:underline [&_a]:underline-offset-4">
          {children}
        </div>
        <footer className="border-t border-[var(--color-line-strong)] pt-5 text-sm text-[var(--color-ink-muted)]">
          Digisol LLC-FZ · COEX business platform
        </footer>
      </article>
    </main>
  );
}
