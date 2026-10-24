import { BrandLogo } from '@/components/brand-logo';
import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';

function PoweredBy({ rail = false }: { rail?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-2 ${rail ? 'items-start text-[var(--color-rail-ink-muted)]' : 'items-center text-[var(--color-ink-muted)]'}`}
    >
      <span className="text-xs">Powered by DigiSol</span>
      <Image
        src="/brand/logo-long.png"
        alt="DigiSol logo"
        width={3671}
        height={1240}
        className="h-auto w-24 max-w-full object-contain"
        unoptimized
      />
    </div>
  );
}

/**
 * The frame of every signed-out page: sign in, forgot password and set a new password. Two panels:
 * the dark one carries the brand, the light one carries the work. The same division the rest of
 * the product uses, stated on the first screen anyone sees.
 */
export function AuthShell({
  title,
  intro,
  children,
  beforeTitle,
}: {
  beforeTitle?: ReactNode;
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen">
      <section className="relative hidden w-1/2 flex-col justify-between bg-[image:var(--gradient-rail)] p-12 lg:flex">
        <BrandLogo inverse className="h-14 w-56 max-w-full" priority />

        <div>
          <h2 className="max-w-md text-3xl leading-tight font-bold text-[var(--color-rail-ink)]">
            One place for customers, work and support.
          </h2>
          <p className="mt-4 max-w-md text-[var(--color-rail-ink-muted)]">
            Worktello brings together tasks, timesheets, tickets and the client history behind them,
            without four systems that disagree.
          </p>
        </div>

        <PoweredBy rail />
      </section>

      <section className="flex min-w-0 w-full items-center justify-center px-2.5 py-12 min-[360px]:px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <BrandLogo className="mb-8 h-10 w-44 max-w-full lg:hidden" priority />

          {beforeTitle}
          <h1 className="text-2xl font-bold text-[var(--color-ink)]">{title}</h1>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{intro}</p>

          {children}
          <nav
            aria-label="Legal information"
            className="mt-8 flex justify-center gap-5 text-xs text-[var(--color-ink-muted)]"
          >
            <Link href="/privacy" className="underline underline-offset-4">
              Privacy Policy
            </Link>
            <Link href="/terms" className="underline underline-offset-4">
              Terms of Use
            </Link>
          </nav>
          <div className="mt-8 lg:hidden">
            <PoweredBy />
          </div>
        </div>
      </section>
    </main>
  );
}
