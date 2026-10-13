/**
 * Which sidebar groups this browser has collapsed.
 *
 * Kept in a small external store rather than in component state so the value can be read during
 * render without a hydration mismatch: the server always sees an empty list, and the browser reads
 * the real one on its first render. This is a per browser convenience, never data the product
 * depends on, so every access tolerates storage being unavailable.
 */

const STORAGE_KEY = 'coex.navigation.collapsed';
const EMPTY: string[] = [];

const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedValue: string[] = EMPTY;

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

export function getCollapsedSnapshot(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    // The cache keeps the returned array reference stable, which useSyncExternalStore requires.
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedValue = raw ? (JSON.parse(raw) as string[]) : EMPTY;
    }

    return cachedValue;
  } catch {
    return EMPTY;
  }
}

export function getServerSnapshot(): string[] {
  return EMPTY;
}

export function toggleCollapsed(id: string): void {
  const current = getCollapsedSnapshot();
  const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Not worth telling anyone: the sidebar still works for this visit.
  }

  cachedRaw = JSON.stringify(next);
  cachedValue = next;

  for (const listener of listeners) listener();
}
