'use client';

import { useEffect, useSyncExternalStore } from 'react';

/**
 * Browser notifications (John's team, 15 Oct 2026).
 *
 * Opt in per person and per browser: the choice is kept in this browser, and the browser's own
 * permission is asked for once. While COEX is open in any tab, a poll every 30 seconds asks
 * /api/notifications what is new (a customer wrote on my ticket, or someone assigned me a task) and
 * shows a notification for anything not yet shown. It only speaks when the tab is hidden: a person
 * looking at COEX already has the badges. It cannot reach a browser that is closed; that would need
 * a push service, which this deliberately does not add.
 */

const ENABLED_KEY = 'coex-browser-notifications';
const SINCE_KEY = 'coex-notifications-since';
const POLL_MS = 30 * 1000;

interface NotificationEvent {
  id: string;
  title: string;
  body: string;
  url: string;
}

export type NotificationState = 'unsupported' | 'blocked' | 'off' | 'on';

function readEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) === 'yes';
  } catch {
    return false;
  }
}

function currentState(): NotificationState {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  return Notification.permission === 'granted' && readEnabled() ? 'on' : 'off';
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

function announceChange() {
  for (const listener of listeners) listener();
}

/** What the menu shows and does; the polling itself lives in BrowserNotifications. */
export function useNotificationSwitch() {
  // The browser is the source of truth (its permission and this site's stored choice), so the
  // state is read from it rather than copied into React; the server always renders "off".
  const state = useSyncExternalStore<NotificationState>(subscribe, currentState, () => 'off');

  async function turnOn() {
    if (typeof Notification === 'undefined') return;
    const permission = await Notification.requestPermission();
    try {
      if (permission === 'granted') {
        localStorage.setItem(ENABLED_KEY, 'yes');
        // Start from now, so turning it on does not replay the past.
        localStorage.setItem(SINCE_KEY, new Date().toISOString());
      }
    } catch {
      // Storage blocked: the switch simply stays off.
    }
    announceChange();
  }

  function turnOff() {
    try {
      localStorage.removeItem(ENABLED_KEY);
    } catch {
      // Nothing to undo.
    }
    announceChange();
  }

  return { state, turnOn, turnOff };
}

/** Mounted once in the app shell. Does nothing unless the person turned notifications on. */
export function BrowserNotifications() {
  useEffect(() => {
    async function poll() {
      if (currentState() !== 'on') return;

      try {
        const since = localStorage.getItem(SINCE_KEY);
        const response = await fetch(
          `/api/notifications${since ? `?since=${encodeURIComponent(since)}` : ''}`,
          { cache: 'no-store' },
        );
        if (!response.ok) return;

        const { events, serverTime } = (await response.json()) as {
          events: NotificationEvent[];
          serverTime: string;
        };
        localStorage.setItem(SINCE_KEY, serverTime);

        // Someone looking at COEX already sees the badges; speak only to a hidden tab.
        if (document.visibilityState === 'visible' && document.hasFocus()) return;

        for (const event of events) {
          // The tag makes two open tabs show one notification, not two.
          const shown = new Notification(event.title, {
            body: event.body,
            tag: event.id,
          });
          shown.onclick = () => {
            window.focus();
            window.location.assign(event.url);
            shown.close();
          };
        }
      } catch {
        // Offline for a moment; the next poll catches up from the stored time.
      }
    }

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  return null;
}
