import { describe, expect, it } from 'vitest';
import {
  daysBetween,
  deriveContractStatus,
  needsExpiryWarning,
  reminderDue,
  renewalTerm,
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

describe('renewals', () => {
  it('renews a calendar year to the next calendar year', () => {
    expect(renewalTerm('2026-01-01', '2026-12-31')).toEqual({
      startDate: '2027-01-01',
      endDate: '2027-12-31',
    });
    expect(renewalTerm('2027-03-15', '2028-03-14')).toEqual({
      startDate: '2028-03-15',
      endDate: '2029-03-14',
    });
  });

  it('keeps the length of a term that is not a year', () => {
    expect(renewalTerm('2026-01-01', '2026-06-30')).toEqual({
      startDate: '2026-07-01',
      endDate: '2026-12-28',
    });
  });

  it('sends each reminder once and one email for several crossed at once', () => {
    expect(reminderDue(80, [60, 30], [])).toEqual({ send: false, markSent: [] });
    expect(reminderDue(60, [60, 30], [])).toEqual({ send: true, markSent: [60] });
    expect(reminderDue(59, [60, 30], [60])).toEqual({ send: false, markSent: [] });
    expect(reminderDue(30, [60, 30], [60])).toEqual({ send: true, markSent: [30] });
    expect(reminderDue(10, [60, 30], [])).toEqual({ send: true, markSent: [60, 30] });
  });
});
