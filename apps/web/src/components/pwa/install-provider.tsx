'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallContext = createContext({
  available: false,
  installed: false,
  busy: false,
  feedback: '',
  install: async () => {},
});

/** Keep the browser's one-use installation event across client-side navigation. */
export function InstallProvider({ children }: { children: ReactNode }) {
  const prompt = useRef<InstallPromptEvent | null>(null);
  const [available, setAvailable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const display = window.matchMedia('(display-mode: standalone)');
    const syncDisplay = () => {
      const ios = navigator as Navigator & { standalone?: boolean };
      setInstalled(display.matches || ios.standalone === true);
    };
    const capture = (event: Event) => {
      event.preventDefault();
      prompt.current = event as InstallPromptEvent;
      setAvailable(true);
    };
    const complete = () => {
      prompt.current = null;
      setAvailable(false);
      setInstalled(true);
      setFeedback('Worktello is installed. Launch it from your app icon.');
    };
    syncDisplay();
    display.addEventListener('change', syncDisplay);
    window.addEventListener('beforeinstallprompt', capture);
    window.addEventListener('appinstalled', complete);
    return () => {
      display.removeEventListener('change', syncDisplay);
      window.removeEventListener('beforeinstallprompt', capture);
      window.removeEventListener('appinstalled', complete);
    };
  }, []);

  async function install() {
    const event = prompt.current;
    if (!event || busy) return;
    prompt.current = null;
    setAvailable(false);
    setBusy(true);
    setFeedback('');
    try {
      await event.prompt();
      const choice = await event.userChoice;
      setFeedback(
        choice.outcome === 'accepted'
          ? 'Installation accepted. Look for Worktello in your applications.'
          : 'Installation was cancelled. You can use the browser menu to install later.',
      );
    } catch {
      setFeedback('Please use the browser menu to install Worktello using the steps below.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <InstallContext.Provider value={{ available, installed, busy, feedback, install }}>
      {children}
    </InstallContext.Provider>
  );
}

export function useInstall() {
  return useContext(InstallContext);
}
