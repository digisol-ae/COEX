import Image from 'next/image';
import type { ReactNode } from 'react';

/**
 * The frame of every signed-out page: sign in, forgot password and set a new password. Two panels:
 * the dark one carries the brand, the light one carries the work. The same division the rest of
 * the product uses, stated on the first screen anyone sees.
 */
export function AuthShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen">
      <section className="relative hidden w-1/2 flex-col justify-between bg-[image:var(--gradient-rail)] p-12 lg:flex">
        <Image
          src="/brand/logo-long.png"
          alt="DigiSol"
          width={296}
          height={200}
          priority
          className="h-12 w-auto object-contain"
        />

        <div>
          <h2 className="max-w-md text-3xl leading-tight font-bold text-[var(--color-rail-ink)]">
            One place for customers, work and support.
          </h2>
          <p className="mt-4 max-w-md text-[var(--color-rail-ink-muted)]">
            COEX, short for Co-existence. Tasks, timesheets, tickets and the client history behind
            them, without four systems that disagree.
          </p>
        </div>

        <p className="text-xs text-[var(--color-rail-ink-muted)]">DigiSol Information Technology</p>
      </section>

      <section className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <Image
            src="/brand/logo-long.png"
            alt="DigiSol"
            width={237}
            height={80}
            priority
            className="mb-10 h-8 w-auto lg:hidden"
          />

          <h1 className="text-2xl font-bold text-[var(--color-ink)]">{title}</h1>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{intro}</p>

          {children}
        </div>
      </section>
    </main>
  );
}
