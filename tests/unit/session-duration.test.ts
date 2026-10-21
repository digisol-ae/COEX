import { afterEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
const { create } = vi.hoisted(() => ({ create: vi.fn().mockResolvedValue({}) }));
vi.mock('@coex/shared/core/models/session.model', () => ({ SessionModel: { create } }));
import { createSession } from '@/modules/core/services/session.service';
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
describe('remembered session lifetime', () => {
  it.each([
    [true, 60],
    [false, 30],
    [undefined, 30],
  ] as const)('rememberMe=%s has %s day server expiry', async (rememberMe, days) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-18T00:00:00Z'));
    const result = await createSession({
      userId: new Types.ObjectId(),
      tenantId: new Types.ObjectId(),
      rememberMe,
    });
    expect(result.expiresAt.getTime() - Date.now()).toBe(days * 86400000);
    expect(create.mock.calls.at(-1)?.[0].expiresAt).toEqual(result.expiresAt);
    expect(create.mock.calls.at(-1)?.[0].token).not.toBe(result.token);
  });
});
