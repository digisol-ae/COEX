'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

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

function readEnabled(scope = ''): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY + scope) === 'yes';
  } catch {
    return false;
  }
}

function currentState(scope = ''): NotificationState {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  return Notification.permission === 'granted' && readEnabled(scope) ? 'on' : 'off';
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
export function useNotificationSwitch(scope = '') {
  // The browser is the source of truth (its permission and this site's stored choice), so the
  // state is read from it rather than copied into React; the server always renders "off".
  const state = useSyncExternalStore<NotificationState>(
    subscribe,
    () => currentState(scope),
    () => 'off',
  );

  const [feedback, setFeedback] = useState('');
  async function turnOn() {
    try {
      if (typeof Notification === 'undefined') {
        setFeedback(
          'This browser does not support desktop notifications. Open Worktello in Chrome or Edge.',
        );
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setFeedback(
          permission === 'denied'
            ? 'Notifications are blocked. Allow notifications for this site in your browser settings.'
            : 'Notification permission was not granted. If no prompt appeared, open Worktello in Chrome or Edge and try again.',
        );
        announceChange();
        return;
      }
      localStorage.setItem(ENABLED_KEY + scope, 'yes');
      localStorage.setItem(SINCE_KEY + scope, new Date().toISOString());
      setFeedback('Notifications are on. Alerts appear while Worktello is open in another tab.');
    } catch {
      setFeedback(
        'This browser could not enable notifications. Open Worktello in Chrome or Edge and try again.',
      );
    }
    announceChange();
  }
  function testNotification() {
    try {
      if (currentState(scope) !== 'on') {
        setFeedback('Enable browser notifications first.');
        return;
      }
      new Notification('Worktello · Test notification', {
        body: 'Browser notifications are working.',
        requireInteraction: true,
        tag: `coex-notification-test-${Date.now()}`,
      });
      setFeedback(
        'Test sent. If no alert appeared, check your system notification settings and Do Not Disturb.',
      );
    } catch {
      setFeedback('Desktop notification could not be shown by this browser.');
    }
  }

  function turnOff() {
    setFeedback('Notifications are off.');
    try {
      localStorage.removeItem(ENABLED_KEY + scope);
    } catch {
      // Nothing to undo.
    }
    announceChange();
  }

  return { state, turnOn, turnOff, feedback, testNotification };
}

/** Mounted once in the app shell. Does nothing unless the person turned notifications on. */
export function BrowserNotifications({
  endpoint = '/api/notifications',
  scope = '',
}: {
  endpoint?: string;
  scope?: string;
}) {
  useEffect(() => {
    async function poll() {
      if (currentState(scope) !== 'on') return;

      try {
        const since = localStorage.getItem(SINCE_KEY + scope);
        const response = await fetch(
          `${endpoint}${since ? `?since=${encodeURIComponent(since)}` : ''}`,
          { cache: 'no-store' },
        );
        if (!response.ok) return;

        const { events, serverTime } = (await response.json()) as {
          events: NotificationEvent[];
          serverTime: string;
        };
        localStorage.setItem(SINCE_KEY + scope, serverTime);

        // Someone looking at COEX already sees the badges; speak only to a hidden tab.
        if (document.visibilityState === 'visible' && document.hasFocus()) return;

        for (const event of events) {
          // The tag makes two open tabs show one notification, not two.
          const shown = new Notification(event.title, {
            body: event.body,
            tag: event.id,
            requireInteraction: true,
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
  }, [endpoint, scope]);

  return null;
}
