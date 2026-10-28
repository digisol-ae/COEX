import { describe, expect, it } from 'vitest';
import { createRefreshGate } from '@/components/ui/refresh-policy';
const ready = { visible: true, online: true, editing: false, modalOpen: false };
describe('background refresh policy', () => {
  it('coalesces focus, timer and manual requests until completion', () => {
    const gate = createRefreshGate(0);
    expect(gate.acquire('timer', ready, 29999)).toBe(false);
    expect(gate.acquire('timer', ready, 30000)).toBe(true);
    expect(gate.acquire('focus', ready, 40000)).toBe(false);
    expect(gate.acquire('manual', ready, 40000)).toBe(false);
    gate.complete();
    expect(gate.acquire('focus', ready, 39999)).toBe(false);
    expect(gate.acquire('focus', ready, 40000)).toBe(true);
  });
  it.each([{ visible: false }, { online: false }, { editing: true }, { modalOpen: true }])(
    'pauses automatic updates for %j',
    (state) => {
      expect(createRefreshGate(0).acquire('timer', { ...ready, ...state }, 30000)).toBe(false);
    },
  );
  it('allows an explicit refresh during editing but never offline', () => {
    expect(createRefreshGate(0).acquire('manual', { ...ready, editing: true }, 1)).toBe(true);
    expect(createRefreshGate(0).acquire('manual', { ...ready, online: false }, 1)).toBe(false);
  });
});
