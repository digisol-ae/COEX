'use client';

import { useEffect, useState } from 'react';

export const SUPPORT_HREF = '/support/tickets';
const POLL_MS = 30 * 1000;

/**
 * The Support number, kept current on pages that never refresh, so a new email ticket shows on the
 * rail, or the phone menu, while someone is working in Tasks. A polled value only stands until the server sends a
 * newer one with the page, which is how opening a ticket clears it at once.
 */
export function useLiveUnreadCount(serverCount: number | undefined, enabled: boolean) {
  const [polled, setPolled] = useState<{ basis: number | undefined; value: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    async function poll() {
      if (document.visibilityState !== 'visible') return;
      try {
        const response = await fetch('/api/tickets/unread', { cache: 'no-store' });
        if (!response.ok) return;
        const { count } = (await response.json()) as { count: number };
        setPolled({ basis: serverCount, value: count });
      } catch {
        // Offline for a moment; the next poll or page load catches up.
      }
    }

    const timer = setInterval(poll, POLL_MS);
    document.addEventListener('visibilitychange', poll);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [enabled, serverCount]);

  return polled && polled.basis === serverCount ? polled.value : serverCount;
}
