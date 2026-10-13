'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { IconButton } from '@/components/ui/icon-button';

/**
 * Back to the previous screen, on every screen (John, 1 Oct 2026). A task opened from My Desk,
 * then its preview, then Open task, returns the same way, which a "Back to space" link cannot.
 *
 * The screens visited are kept per browser tab (session storage), so Back survives a refresh and
 * never leaves COEX: a page opened directly (a link in an email, a bookmark) has no previous screen
 * and goes to the dashboard instead.
 */
const HOME = '/dashboard';
const STORAGE_KEY = 'coex.backTrail';
const LONGEST_TRAIL = 50;

const listeners = new Set<() => void>();

function readStored(): string {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function parse(stored: string): string[] {
  try {
    const value: unknown = JSON.parse(stored || '[]');
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function store(trail: string[]) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trail.slice(-LONGEST_TRAIL)));
  } catch {
    // Storage blocked: Back still works until the next refresh, from the browser's own history.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const trail = parse(useSyncExternalStore(subscribe, readStored, () => ''));

  useEffect(() => {
    const current = parse(readStored());
    if (current[current.length - 1] === pathname) return;
    // Arriving at the screen before this one is a step back, so it leaves the trail.
    store(
      current.length > 1 && current[current.length - 2] === pathname
        ? current.slice(0, -1)
        : [...current, pathname],
    );
  }, [pathname]);

  // Until the trail catches up with a new screen, the last entry is the screen just left.
  const previousScreens = trail[trail.length - 1] === pathname ? trail.length - 1 : trail.length;
  const hasPrevious = previousScreens > 0;
  if (!hasPrevious && pathname === HOME) return null;

  return (
    <IconButton
      icon="back"
      label={hasPrevious ? 'Back' : 'Back to dashboard'}
      className="h-9 w-9"
      onClick={() => (hasPrevious ? router.back() : router.push(HOME))}
    />
  );
}
