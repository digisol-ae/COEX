import { beforeEach, expect, it, vi } from 'vitest';

const mocked = vi.hoisted(() => ({
  connect: vi.fn(),
  aggregate: vi.fn(),
  finish: vi.fn(),
  context: vi.fn((_context: unknown, work: () => unknown) => work()),
}));
vi.mock('@/lib/db', () => ({ connectToDatabase: mocked.connect }));
vi.mock('@/lib/tenant-context', () => ({ runWithContext: mocked.context }));
vi.mock('@/modules/tasks/models/desk-entry.model', () => ({
  DeskEntryModel: { aggregate: mocked.aggregate },
}));
vi.mock('@/modules/tasks/services/desk.service', () => ({ finishMyDesk: mocked.finish }));
import { closeOfficeDay } from '@/modules/tasks/services/desk-close.service';

beforeEach(() => vi.resetAllMocks());

it('reports a failed user, continues other desks and preserves the close timestamp', async () => {
  mocked.aggregate.mockResolvedValue([
    { _id: { tenantId: 'tenant', userId: 'first' } },
    { _id: { tenantId: 'tenant', userId: 'second' } },
  ]);
  mocked.finish
    .mockRejectedValueOnce(new Error('Snapshot write failed'))
    .mockResolvedValue(undefined);
  const at = new Date('2026-09-30T19:59:59Z');
  const result = await closeOfficeDay(at);
  expect(result).toEqual({
    users: 1,
    failures: [{ userId: 'first', message: 'Snapshot write failed' }],
  });
  expect(mocked.finish).toHaveBeenNthCalledWith(1, at);
  expect(mocked.finish).toHaveBeenNthCalledWith(2, at);
});
