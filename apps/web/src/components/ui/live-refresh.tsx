'use client';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createRefreshGate, REFRESH_INTERVAL_MS, type RefreshSource } from './refresh-policy';
/** Keep active pages current without overlapping requests or interrupting an editor/dialog. */
export function LiveRefresh() {
  const router = useRouter();
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [gate] = useState(() => createRefreshGate(Date.now()));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  useEffect(() => {
    if (!pending) gate.complete();
  }, [pending, gate]);
  const refresh = useCallback(
    (source: RefreshSource) => {
      const conditions = {
        visible: document.visibilityState === 'visible',
        online: navigator.onLine !== false,
        editing: isTyping(),
        modalOpen: [...document.querySelectorAll('dialog[open], [aria-modal="true"]')].some(
          (element) => element.getClientRects().length > 0,
        ),
      };
      if (!gate.acquire(source, conditions, Date.now())) return;
      setError('');
      try {
        startTransition(() => {
          router.refresh();
          setUpdatedAt(new Date());
        });
      } catch {
        gate.complete();
        setError('Could not refresh. Try again.');
      }
    },
    [gate, router, startTransition],
  );
  useEffect(() => {
    const timer = setInterval(() => refresh('timer'), REFRESH_INTERVAL_MS);
    const onVisible = () => refresh('focus');
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [refresh]);
  return (
    <button
      type="button"
      onClick={() => refresh('manual')}
      disabled={pending}
      aria-busy={pending || undefined}
      aria-label="Refresh page"
      className="inline-flex items-center gap-1.5 text-[11px] text-[var(--color-ink-subtle)] disabled:opacity-60"
      title={
        error ||
        'Refresh now. Automatic updates run every 30 seconds and pause while editing, in dialogs, offline or in hidden tabs.'
      }
      suppressHydrationWarning
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-status-ok)]" aria-hidden />
      {pending ? (
        'Refreshing…'
      ) : error ? (
        'Refresh failed'
      ) : (
        <>Updated {updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
      )}
      <span aria-hidden>↻</span>
    </button>
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
