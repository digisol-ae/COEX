'use client';
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FloatingTutorial } from '@/modules/tutorials/floating-tutorial';
import { IconButton } from '@/components/ui/icon-button';
const SetupContext = createContext(false);
export const useSetupWorkspace = () => useContext(SetupContext);
export function SetupWorkspace({
  tabs,
  children,
}: {
  tabs: { href: string; label: string }[];
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams();
  const raw = query.get('returnTo') ?? '/dashboard';
  const returnTo =
    raw.startsWith('/') &&
    !raw.startsWith('//') &&
    !raw.includes('\\') &&
    !/[\r\n]/.test(raw) &&
    !raw.startsWith('/setup')
      ? raw
      : '/dashboard';
  const active = tabs.find((tab) => tab.href === pathname)?.href ?? tabs[0]?.href;
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);
  function close() {
    router.push(returnTo);
  }
  return (
    <SetupContext.Provider value={true}>
      <dialog
        ref={dialog}
        aria-label="Setup"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        className="setup-workspace fixed inset-0 m-auto h-[min(90dvh,56rem)] max-h-[100dvh] w-[min(96vw,76rem)] max-w-none overflow-visible rounded-2xl border border-[var(--color-line)] bg-[var(--color-canvas)] p-0 text-[var(--color-ink)] shadow-2xl backdrop:bg-[var(--color-popup-backdrop)] max-sm:h-dvh max-sm:w-screen max-sm:rounded-none"
      >
        <div className="flex h-full flex-col overflow-hidden rounded-[inherit]">
          <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3">
            <h1 className="font-semibold">Setup</h1>
            <IconButton icon="close" label="Close setup" onClick={close} />
          </header>
          <nav
            aria-label="Setup sections"
            className="shrink-0 overflow-x-auto border-b border-[var(--color-line)] bg-[var(--color-surface)] px-3"
          >
            <div
              role="tablist"
              aria-label="Setup tabs"
              className="flex w-max min-w-full gap-1"
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                const links = Array.from(
                  event.currentTarget.querySelectorAll<HTMLAnchorElement>('[role="tab"]'),
                );
                const index = links.indexOf(event.target as HTMLAnchorElement);
                if (index < 0) return;
                event.preventDefault();
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? links.length - 1
                      : (index + (event.key === 'ArrowRight' ? 1 : -1) + links.length) %
                        links.length;
                links[next]?.focus();
                links[next]?.click();
              }}
            >
              {tabs.map((tab) => (
                <Link
                  key={tab.href}
                  role="tab"
                  id={`setup-tab-${tab.href.split('/').pop()}`}
                  aria-selected={active === tab.href}
                  aria-controls="setup-panel"
                  tabIndex={active === tab.href ? 0 : -1}
                  href={`${tab.href}?${new URLSearchParams({ returnTo })}`}
                  className={`shrink-0 border-b-2 px-3 py-3 text-sm ${active === tab.href ? 'border-[var(--color-brand-red)] font-semibold text-[var(--color-ink)]' : 'border-transparent text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'}`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </nav>
          <section
            id="setup-panel"
            role="tabpanel"
            aria-labelledby={`setup-tab-${active?.split('/').pop()}`}
            className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5"
          >
            {children}
          </section>
        </div>
        <FloatingTutorial previewOnly />
      </dialog>
    </SetupContext.Provider>
  );
}
