'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { logoutAction } from '@/app/login/actions';
import { Avatar } from '@/components/ui/avatar';

/**
 * The person's own menu, at the top right: their avatar opens a menu holding the profile, the menu
 * order and sign out (John, 27 Sep 2026). Only the workspace name shows beside the avatar; the
 * role is an administrator's concern, not something a person needs on every screen.
 */
export function UserMenu({
  name,
  email,
  tenantName,
}: {
  name: string;
  email: string;
  tenantName: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      const outside =
        event instanceof KeyboardEvent
          ? event.key === 'Escape'
          : !box.current?.contains(event.target as Node);
      if (outside) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Your account: ${name}`}
        className="flex min-w-0 items-center gap-2.5 rounded-[var(--radius-control)] py-1 pr-1.5 pl-1 transition-colors hover:bg-[var(--color-surface-muted)]"
      >
        <Avatar name={name} />
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block truncate text-sm font-medium text-[var(--color-ink)]">{name}</span>
          <span className="block truncate text-xs text-[var(--color-ink-subtle)]">
            {tenantName}
          </span>
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
          className="hidden text-[var(--color-ink-subtle)] sm:block"
        >
          <path
            d="M3 4.5 6 7.5l3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Your account"
          className="popup-glass fixed inset-x-4 top-16 z-50 p-1.5 sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-1 sm:w-64"
        >
          <div className="border-b border-[var(--color-line)] px-2.5 pt-1.5 pb-2.5">
            <p className="truncate text-sm font-medium text-[var(--color-ink)]">{name}</p>
            <p className="truncate text-xs text-[var(--color-ink-subtle)]">{email}</p>
          </div>

          <div className="py-1">
            <MenuLink href="/profile" onNavigate={() => setOpen(false)} icon={<PersonIcon />}>
              Edit profile
            </MenuLink>
            <MenuLink href="/menu-order" onNavigate={() => setOpen(false)} icon={<ListIcon />}>
              Arrange my menu
            </MenuLink>
          </div>

          <form action={logoutAction} className="border-t border-[var(--color-line)] pt-1">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-left text-sm text-[var(--color-status-alert)] transition-colors hover:bg-[var(--color-status-alert-soft)]"
            >
              <SignOutIcon />
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  children,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="flex items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-sm text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-muted)]"
    >
      <span className="text-[var(--color-ink-subtle)]">{icon}</span>
      {children}
    </Link>
  );
}

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="5.5" r="2.5" {...stroke} />
      <path d="M3 13.5c.6-2.3 2.6-3.5 5-3.5s4.4 1.2 5 3.5" {...stroke} />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" {...stroke} />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M7 15.5H4a1.5 1.5 0 0 1-1.5-1.5V4A1.5 1.5 0 0 1 4 2.5h3" {...stroke} />
      <path d="M11.5 12 15 9l-3.5-3M15 9H7" {...stroke} />
    </svg>
  );
}
