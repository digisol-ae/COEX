'use client';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

type Turnstile = {
  render: (node: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};

/** Remount after every submission: Turnstile tokens are single use, including failed forms. */
export function Captcha({ action, pending }: { action: string; pending: boolean }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!siteKey || !ready || pending || !container.current) return;
    const api = (window as Window & { turnstile?: Turnstile }).turnstile;
    if (!api) return;
    const id = api.render(container.current, {
      sitekey: siteKey,
      action,
      theme: 'auto',
      'error-callback': () => setError(true),
      callback: () => setError(false),
    });
    return () => api.remove(id);
  }, [siteKey, ready, pending, action, retry]);
  if (!siteKey) return null;
  return (
    <div className="space-y-1">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)}
        onError={() => setError(true)}
      />
      <div ref={container} aria-label="Security check" />
      {error ? (
        <p role="alert" className="text-sm">
          Security check could not load.{' '}
          <button
            type="button"
            className="underline"
            onClick={() => {
              if (!ready) {
                window.location.reload();
                return;
              }
              setError(false);
              setRetry((value) => value + 1);
            }}
          >
            Try again
          </button>
        </p>
      ) : null}
    </div>
  );
}
