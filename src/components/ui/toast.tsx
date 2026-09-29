'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type ToastContextValue = { showToast: (message: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

/** A single short confirmation after a change safely reaches the server. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const dismissTimer = useRef<number | null>(null);

  const showToast = useCallback((nextMessage: string) => {
    if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    setMessage(nextMessage);
    dismissTimer.current = window.setTimeout(() => setMessage(null), 4000);
  }, []);

  useEffect(() => () => {
    if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message ? (
        <div className="pointer-events-none fixed inset-x-4 bottom-5 z-[70] flex justify-center" role="status" aria-live="polite">
          <div className="flex max-w-md items-center gap-2 rounded-[var(--radius-control)] border border-emerald-300/60 bg-emerald-950 px-4 py-3 text-sm font-medium text-emerald-50 shadow-lg">
            <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-xs font-bold text-emerald-950">✓</span>
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
