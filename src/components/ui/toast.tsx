'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type ToastContextValue = { showToast: (message: string, tone?: 'ok' | 'alert') => void };

const ToastContext = createContext<ToastContextValue | null>(null);

/** A single short confirmation after a change safely reaches the server. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'ok' | 'alert'>('ok');
  const dismissTimer = useRef<number | null>(null);

  const showToast = useCallback((nextMessage: string, nextTone: 'ok' | 'alert' = 'ok') => {
    setTone(nextTone);
    if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    setMessage(nextMessage);
    dismissTimer.current = window.setTimeout(() => setMessage(null), 4000);
  }, []);

  useEffect(
    () => () => {
      if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message ? (
        <div
          className="pointer-events-none fixed inset-x-4 bottom-5 z-[70] flex justify-center"
          role="status"
          aria-live="polite"
        >
          <div
            className={
              'flex max-w-md items-center gap-2 rounded-[var(--radius-control)] border px-4 py-3 text-sm font-medium shadow-lg ' +
              (tone === 'alert'
                ? 'border-red-300/60 bg-red-950 text-red-50'
                : 'border-emerald-300/60 bg-emerald-950 text-emerald-50')
            }
          >
            <span aria-hidden="true">{tone === 'alert' ? '!' : '✓'}</span>
            {message}
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider.');
  return context;
}
