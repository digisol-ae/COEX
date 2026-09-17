import Image from 'next/image';

/**
 * Placeholder landing page. Replaced by the dashboard in M3.
 * It exists now to prove the brand tokens and the local font render correctly.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6">
      <Image
        src="/brand/logo-long.png"
        alt="DigiSol"
        width={220}
        height={48}
        priority
        className="h-12 w-auto"
      />

      <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-surface)] p-8">
        <p className="text-sm font-medium tracking-wide text-[var(--color-ink-subtle)] uppercase">
          Phase 1, milestone 1
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[var(--color-ink)]">DigiSol ECO</h1>
        <p className="mt-3 max-w-xl text-[var(--color-ink-muted)]">
          Foundation in progress: tenancy, sign on, roles and the audit log. The dashboard replaces
          this screen in milestone three.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--color-status-ok-soft)] px-3 py-1 text-sm text-[var(--color-status-ok)]">
            Scaffold ready
          </span>
          <span className="rounded-full bg-[var(--color-status-info-soft)] px-3 py-1 text-sm text-[var(--color-status-info)]">
            Brand tokens applied
          </span>
          <span className="rounded-full bg-[var(--color-status-warn-soft)] px-3 py-1 text-sm text-[var(--color-status-warn)]">
            Entra registration pending
          </span>
        </div>
      </div>
    </main>
  );
}
