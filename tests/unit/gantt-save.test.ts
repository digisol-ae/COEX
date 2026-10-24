import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ can: vi.fn(), get: vi.fn(), update: vi.fn(), audit: vi.fn() }));
vi.mock('@/modules/crm/services/access.service', () => ({ actorCan: m.can }));
vi.mock('@/modules/tasks/services/task.service', () => ({ getTask: m.get }));
vi.mock('@/lib/repository', () => ({ repository: () => ({ updateOne: m.update }) }));
vi.mock('@/modules/core/services/audit.service', () => ({ recordAudit: m.audit }));
import { saveGanttSchedule } from '@/modules/tasks/services/gantt.service';
const input = {
  id: '111111111111111111111111',
  spaceId: '222222222222222222222222',
  startAt: '2026-10-24T05:00:00Z',
  endAt: '2026-10-24T13:00:00Z',
  expectedStartAt: '2026-10-23T05:00:00Z',
  expectedEndAt: '2026-10-23T13:00:00Z',
};
beforeEach(() => {
  vi.resetAllMocks();
  m.can.mockResolvedValue(true);
  m.get.mockResolvedValue({
    _id: input.id,
    spaceId: input.spaceId,
    isClosed: false,
    startAt: new Date(input.expectedStartAt),
    endAt: new Date(input.expectedEndAt),
  });
  m.update.mockResolvedValue({});
  m.audit.mockResolvedValue(undefined);
});
it('requires manage permission before accessing records', async () => {
  m.can.mockResolvedValue(false);
  await expect(saveGanttSchedule(input)).rejects.toThrow('may not');
  expect(m.get).not.toHaveBeenCalled();
});
it('refuses invisible, wrong-space and closed tasks', async () => {
  m.get.mockResolvedValue(null);
  await expect(saveGanttSchedule(input)).rejects.toThrow('not found');
  m.get.mockResolvedValue({ _id: input.id, spaceId: 'other' });
  await expect(saveGanttSchedule(input)).rejects.toThrow('not found');
  m.get.mockResolvedValue({ _id: input.id, spaceId: input.spaceId, isClosed: true });
  await expect(saveGanttSchedule(input)).rejects.toThrow('Reopen');
  expect(m.update).not.toHaveBeenCalled();
});
it('rejects invalid, timezone-less or reversed dates', async () => {
  for (const patch of [
    { startAt: 'bad' },
    { startAt: '2026-02-30T05:00:00Z' },
    { startAt: '2026-10-24T14:00Z' },
    { startAt: '2026-10-24T09:00' },
    { expectedEndAt: 'bad' },
  ])
    await expect(saveGanttSchedule({ ...input, ...patch })).rejects.toThrow('valid start');
  expect(m.update).not.toHaveBeenCalled();
});
it('atomically compares original dates and audits the saved result', async () => {
  await expect(saveGanttSchedule(input)).resolves.toEqual({
    startAt: '2026-10-24T05:00:00.000Z',
    endAt: '2026-10-24T13:00:00.000Z',
  });
  expect(m.update.mock.calls[0][0]).toMatchObject({
    startAt: new Date(input.expectedStartAt),
    endAt: new Date(input.expectedEndAt),
    spaceId: input.spaceId,
  });
  expect(m.audit).toHaveBeenCalledOnce();
});
it('rejects stale saves and stale Undo without writing an audit', async () => {
  m.update.mockResolvedValue(null);
  await expect(saveGanttSchedule(input)).rejects.toThrow('changed since');
  expect(m.audit).not.toHaveBeenCalled();
});
