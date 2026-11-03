import Image from 'next/image';
import Link from 'next/link';
import { InstallGuide } from './install-guide';

export const metadata = { title: 'Install Worktello' };

export default function InstallPage() {
  return (
    <main className="min-h-screen bg-[var(--color-canvas)] px-4 py-8 text-[var(--color-ink)] sm:py-12">
      <div className="mx-auto max-w-3xl rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 sm:p-10">
        <Link href="/login" className="text-sm text-[var(--color-ink-muted)] hover:underline">
          ← Back to Worktello
        </Link>
        <Image
          src="/brand/pwa-192.png"
          alt=""
          width={72}
          height={72}
          className="mt-7 rounded-2xl"
        />
        <h1 className="mt-4 text-3xl font-semibold">Worktello, one click away</h1>
        <p className="mt-3 text-[var(--color-ink-muted)]">
          Add Worktello to your computer and launch it from its own icon, in its own window.
        </p>
        <InstallGuide />
      </div>
    </main>
  );
}
