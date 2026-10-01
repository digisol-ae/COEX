'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Desktop notifications for a task assigned, a ticket assigned, and a new ticket (John, 1 Oct
 * 2026), while COEX is open in any tab, even one in the background. Checked every 30 seconds.
 * The browser only asks for permission after a click, so it is switched on from the avatar menu,
 * and the choice is remembered per browser.
 */

const PREFERENCE_KEY = 'coex.browserNotifications';
const SHOWN_KEY = 'coex.browserNotifications.shown';
const POLL_MS = 30_000;

interface Item {
  id: string;
  title: string;
  body: string;
  link: string | null;
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function supported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export type NotificationState = 'unsupported' | 'blocked' | 'on' | 'off';

/** On only with the browser's permission and the person's choice; off is the default. */
function snapshot(): NotificationState {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  let preference: string | null = null;
  try {
    preference = window.localStorage.getItem(PREFERENCE_KEY);
  } catch {
    // Storage unavailable: treat as never chosen.
  }
  return Notification.permission === 'granted' && preference !== 'off' ? 'on' : 'off';
}

export function useNotificationState(): NotificationState {
  return useSyncExternalStore(subscribe, snapshot, () => 'off');
}

function remember(value: 'on' | 'off') {
  try {
    window.localStorage.setItem(PREFERENCE_KEY, value);
  } catch {
    // Works for this visit only.
  }
  for (const listener of listeners) listener();
}

/** From the avatar menu: asks the browser the first time, then switches on or off. */
export async function toggleBrowserNotifications(): Promise<void> {
  if (!supported()) return;
  if (snapshot() === 'on') return remember('off');
  const permission =
    Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  remember(permission === 'granted' ? 'on' : 'off');
}

/** Several COEX tabs all poll; whichever shows a notification first marks it so others skip it. */
function claim(id: string): boolean {
  try {
    const shown = JSON.parse(window.localStorage.getItem(SHOWN_KEY) ?? '[]') as string[];
    if (shown.includes(id)) return false;
    window.localStorage.setItem(SHOWN_KEY, JSON.stringify([...shown, id].slice(-50)));
  } catch {
    // Without storage a second tab may show it too; the tag below usually merges them.
  }
  return true;
}

export function BrowserNotifications() {
  const router = useRouter();
  const state = useNotificationState();
  const cursor = useRef<string | null>(null);

  useEffect(() => {
    if (state !== 'on') return;
    let live = true;

    async function check() {
      try {
        const query = cursor.current ? `?after=${encodeURIComponent(cursor.current)}` : '';
        const response = await fetch(`/api/notifications${query}`);
        if (!response.ok) return;
        const data = (await response.json()) as { now: string; items: Item[] };
        // The first call only sets where to start, so switching on never replays old news.
        const first = cursor.current === null;
        cursor.current = data.now;
        if (!live || first) return;
        for (const item of data.items) {
          if (!claim(item.id)) continue;
          const shown = new Notification(item.title, {
            body: item.body,
            tag: item.id,
            icon: '/brand/monogram.png',
          });
          shown.onclick = () => {
            window.focus();
            if (item.link) router.push(item.link);
            shown.close();
          };
        }
      } catch {
        // Offline for a moment; the next check picks up from the same place.
      }
    }

    void check();
    const timer = setInterval(check, POLL_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [state, router]);

  return null;
}
