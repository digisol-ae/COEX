/**
 * Where the floating timer window sits and whether it is open, per browser. A convenience, never
 * data the product depends on, so storage that is unavailable simply means the defaults.
 */

export interface TimerWindowState {
  /** open: the full window; clock: a floating digital clock; mini: a small bubble. */
  mode: 'open' | 'clock' | 'mini';
  /** Distance from the bottom right corner, so a smaller screen never strands it off the edge. */
  right: number;
  bottom: number;
}

const STORAGE_KEY = 'coex.timer.window';
const DEFAULT: TimerWindowState = { mode: 'clock', right: 20, bottom: 20 };

/** Names used before the three sizes, so a saved choice carries over. */
const RENAMED: Record<string, TimerWindowState['mode']> = { pill: 'clock', closed: 'mini' };

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedValue: TimerWindowState = DEFAULT;

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

export function getSnapshot(): TimerWindowState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      const saved = raw ? (JSON.parse(raw) as Partial<TimerWindowState>) : {};
      const mode = saved.mode ? (RENAMED[saved.mode] ?? saved.mode) : DEFAULT.mode;
      cachedValue = { ...DEFAULT, ...saved, mode };
    }
    return cachedValue;
  } catch {
    return cachedValue;
  }
}

export function getServerSnapshot(): TimerWindowState {
  return DEFAULT;
}

export function updateTimerWindow(change: Partial<TimerWindowState>): void {
  const next = { ...getSnapshot(), ...change };
  const raw = JSON.stringify(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // The window still moves for this visit.
  }
  cachedRaw = raw;
  cachedValue = next;
  for (const listener of listeners) listener();
}
