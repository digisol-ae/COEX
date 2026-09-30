import { describe, expect, it, vi } from 'vitest';
import { createDeskCloseSchedule } from '@/modules/tasks/desk-close-schedule';
import { officeDate, officeInstant } from '@/modules/tasks/office-day';

describe('office-day close', () => {
  const cutoff = new Date('2026-09-30T19:59:59Z');

  it('waits until 23:59:59 in Dubai and closes only once', async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    const schedule = createDeskCloseSchedule(close, new Date('2026-09-30T12:00:00Z'), 'Asia/Dubai');
    await schedule.tick(new Date('2026-09-30T19:59:58.999Z'));
    expect(close).not.toHaveBeenCalled();
    expect(schedule.delay(new Date('2026-09-30T19:59:58Z'))).toBe(1000);
    await schedule.tick(cutoff);
    await schedule.tick(new Date('2026-09-30T20:00:00Z'));
    expect(close).toHaveBeenCalledExactlyOnceWith(cutoff);
  });

  it('retains the previous office date when a failure retries after midnight', async () => {
    const close = vi
      .fn()
      .mockRejectedValueOnce(new Error('Database unavailable'))
      .mockResolvedValue(undefined);
    const schedule = createDeskCloseSchedule(close, new Date('2026-09-30T12:00:00Z'), 'Asia/Dubai');
    await expect(schedule.tick(cutoff)).rejects.toThrow('Database unavailable');
    await schedule.tick(new Date('2026-09-30T20:00:28Z'));
    expect(close).toHaveBeenCalledTimes(1);
    await schedule.tick(new Date('2026-09-30T20:00:29Z'));
    expect(close).toHaveBeenNthCalledWith(2, cutoff);
    expect(officeDate(close.mock.calls[1][0], 'Asia/Dubai')).toBe('2026-09-30');
  });

  it('prevents an overlapping close while a database request is still running', async () => {
    let finish!: () => void;
    const close = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const schedule = createDeskCloseSchedule(close, new Date('2026-09-30T12:00:00Z'), 'Asia/Dubai');
    const pending = schedule.tick(cutoff);
    await schedule.tick(new Date('2026-09-30T20:00:00Z'));
    expect(close).toHaveBeenCalledTimes(1);
    finish();
    await pending;
  });

  it('advances across a daylight-saving change using office calendar dates', async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    const schedule = createDeskCloseSchedule(
      close,
      new Date('2026-10-31T12:00:00Z'),
      'America/New_York',
    );
    await schedule.tick(new Date('2026-11-01T03:59:59Z'));
    await schedule.tick(new Date('2026-11-02T04:59:58Z'));
    expect(close).toHaveBeenCalledTimes(1);
    await schedule.tick(new Date('2026-11-02T04:59:59Z'));
    expect(close).toHaveBeenNthCalledWith(2, new Date('2026-11-02T04:59:59Z'));
  });

  it('uses office dates and midnight boundaries rather than host dates', () => {
    expect(officeDate(new Date('2026-09-30T21:00:00Z'), 'Asia/Dubai')).toBe('2026-10-01');
    expect(officeInstant('2026-10-01', 0, 0, 0, 'Asia/Dubai')).toEqual(
      new Date('2026-09-30T20:00:00Z'),
    );
  });
});
