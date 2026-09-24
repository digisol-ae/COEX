'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const REFRESH_MS = 30 * 1000;

/**
 * Keeps a server rendered page current without a refresh button.
 *
 * Email tickets arrive within seconds, and an agent watching a list that only changes on reload
 * misses them; a button only helps someone who already suspects the list is stale. Refreshing
 * re-runs the server components and keeps client state, so filters, scroll and a half written
 * reply survive. It pauses while the tab is hidden, and while someone is typing, so an update never
 * lands under the cursor mid sentence.
 */
export function LiveRefresh() {
  const router = useRouter();
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const lastRefresh = useRef(0);

  useEffect(() => {
    function refresh() {
      if (document.visibilityState !== 'visible' || isTyping()) return;
      lastRefresh.current = Date.now();
      router.refresh();
      setUpdatedAt(new Date());
    }

    // Coming back to the tab is exactly when someone wants the latest, so do not wait for the timer.
    function onVisible() {
      if (document.visibilityState === 'visible' && Date.now() - lastRefresh.current > 5000) {
        refresh();
      }
    }

    lastRefresh.current = Date.now();
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [router]);

  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-ink-subtle)]"
      title="This page updates itself every 30 seconds."
      // The server and the browser render this a moment apart, and may sit in different time zones.
      suppressHydrationWarning
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-status-ok)]" aria-hidden />
      Updated {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

function isTyping(): boolean {
  const element = document.activeElement;
  if (!(element instanceof HTMLElement)) return false;
  return (
    element.isContentEditable ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    (element instanceof HTMLInputElement &&
      !['checkbox', 'radio', 'button', 'submit'].includes(element.type))
  );
}
