'use client';

import { useInstall } from '@/components/pwa/install-provider';

export function InstallGuide() {
  const { available, installed, busy, feedback, install } = useInstall();
  return (
    <>
      <div className="my-6 rounded-2xl bg-[var(--color-surface-muted)] p-5">
        {installed ? (
          <p role="status" className="font-medium">
            Worktello is installed. Launch it from its app icon.
          </p>
        ) : (
          <>
            {available || busy ? (
              <button
                type="button"
                disabled={busy}
                onClick={install}
                className="rounded-[var(--radius-control)] bg-[var(--color-brand-red)] px-5 py-3 font-semibold text-white disabled:opacity-60"
              >
                {busy ? 'Installing…' : 'Install Worktello'}
              </button>
            ) : null}
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              {available || busy
                ? 'Confirm installation in your browser to add your Worktello icon.'
                : 'Use the steps below to add Worktello. If you already installed it, launch its icon.'}
            </p>
          </>
        )}
        {feedback ? (
          <p role="status" className="mt-3 text-sm">
            {feedback}
          </p>
        ) : null}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <section className="rounded-2xl border border-[var(--color-line)] p-5">
          <h2 className="font-semibold">Windows · Microsoft Edge</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--color-ink-muted)]">
            <li>Open Worktello in Microsoft Edge.</li>
            <li>
              Click the install icon in the address bar, or open ⋯ → More tools → Apps → Install
              this site as an app.
            </li>
            <li>Confirm the name Worktello and choose Install.</li>
            <li>Pin Worktello to your taskbar or Start menu for easy access.</li>
          </ol>
        </section>
        <section className="rounded-2xl border border-[var(--color-line)] p-5">
          <h2 className="font-semibold">Mac · Safari</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--color-ink-muted)]">
            <li>Open Worktello in Safari on macOS Sonoma 14 or later.</li>
            <li>Choose File → Add to Dock, or Share → Add to Dock.</li>
            <li>Confirm the name Worktello and choose Add.</li>
            <li>Open Worktello from its new Dock icon.</li>
          </ol>
        </section>
      </div>
      <p className="mt-5 text-sm text-[var(--color-ink-muted)]">
        Using Chrome on Windows or Mac? Open its menu → Cast, save, and share → Install page as app,
        or use the install icon in the address bar. Menu names can vary by browser version.
      </p>
      <p className="mt-5 text-sm text-[var(--color-ink-muted)]">
        Worktello needs an internet connection. Sign in when asked; your access and permissions stay
        the same. Updates arrive through Worktello as usual. Installing does not enable offline
        editing or change your notification preferences.
      </p>
    </>
  );
}
