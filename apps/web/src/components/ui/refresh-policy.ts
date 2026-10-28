export const REFRESH_INTERVAL_MS = 30000;
export type RefreshSource = 'timer' | 'focus' | 'manual';
export interface RefreshConditions {
  visible: boolean;
  online: boolean;
  editing: boolean;
  modalOpen: boolean;
}
/** One request at a time; focus events and interval ticks share the same gate. */
export function createRefreshGate(initialAt: number) {
  let startedAt = initialAt,
    inFlight = false;
  return {
    acquire(source: RefreshSource, state: RefreshConditions, now: number) {
      if (inFlight || !state.online) return false;
      if (source !== 'manual') {
        if (!state.visible || state.editing || state.modalOpen) return false;
        if (now - startedAt < (source === 'focus' ? 10000 : REFRESH_INTERVAL_MS)) return false;
      }
      inFlight = true;
      startedAt = now;
      return true;
    },
    complete() {
      inFlight = false;
    },
  };
}
