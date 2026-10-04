import { describe, expect, it } from 'vitest';
import {
  daysBetween,
  deriveContractStatus,
  needsExpiryWarning,
  todayKey,
} from '@/modules/crm/contract-status';

describe('deriveContractStatus', () => {
  const active = (endDate: string) => ({ status: 'active' as const, endDate });

  it('is active well before the warning window', () => {
    expect(deriveContractStatus(active('2026-12-31'), '2026-10-04')).toBe('active');
  });

  it('starts expiring when fewer than 30 days remain', () => {
    expect(deriveContractStatus(active('2026-11-03'), '2026-10-04')).toBe('active');
    expect(deriveContractStatus(active('2026-11-02'), '2026-10-04')).toBe('expiring');
  });

  it('is still in force on the last day and expired the day after', () => {
    expect(deriveContractStatus(active('2026-10-04'), '2026-10-04')).toBe('expiring');
    expect(deriveContractStatus(active('2026-10-03'), '2026-10-04')).toBe('expired');
  });

  it('honours a per customer warning window', () => {
    expect(deriveContractStatus(active('2026-12-01'), '2026-10-04', 90)).toBe('expiring');
    expect(deriveContractStatus(active('2026-12-01'), '2026-10-04', 7)).toBe('active');
  });

  it('never warns for a contract that is not active', () => {
    for (const status of ['draft', 'renewed', 'cancelled'] as const) {
      expect(deriveContractStatus({ status, endDate: '2020-01-01' }, '2026-10-04')).toBe(status);
    }
  });

  it('warns for expiring and expired only', () => {
    expect(needsExpiryWarning('expiring')).toBe(true);
    expect(needsExpiryWarning('expired')).toBe(true);
    expect(needsExpiryWarning('active')).toBe(false);
    expect(needsExpiryWarning('renewed')).toBe(false);
  });
});

describe('dates', () => {
  it('counts whole days across a month and year end', () => {
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(daysBetween('2026-10-04', '2026-10-01')).toBe(-3);
  });

  it('reads today in the office time zone, not UTC', () => {
    // 21:00 UTC on 3 October is already 4 October in Dubai (UTC+4).
    expect(todayKey(new Date('2026-10-03T21:00:00Z'))).toBe('2026-10-04');
  });
});
