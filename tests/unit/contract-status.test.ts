import { describe, expect, it } from 'vitest';
import {
  billingSchedule,
  contractExpiryNotice,
  daysBetween,
  deriveContractStatus,
  needsExpiryWarning,
  periodContaining,
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

describe('billing schedule', () => {
  it('splits a year into the billing rhythm, counting from the start', () => {
    const quarters = billingSchedule('2026-01-31', '2027-01-30', 'quarterly');
    expect(quarters.map((period) => [period.startDate, period.endDate])).toEqual([
      ['2026-01-31', '2026-04-29'],
      ['2026-04-30', '2026-07-30'],
      ['2026-07-31', '2026-10-30'],
      ['2026-10-31', '2027-01-30'],
    ]);
    expect(billingSchedule('2026-01-01', '2026-12-31', 'monthly')).toHaveLength(12);
    expect(billingSchedule('2026-01-01', '2026-12-31', 'bimonthly')).toHaveLength(6);
    expect(billingSchedule('2026-01-01', '2026-12-31', 'yearly')).toHaveLength(1);
  });

  it('shortens the last period to the end of the contract', () => {
    const periods = billingSchedule('2026-01-01', '2026-02-15', 'quarterly');
    expect(periods).toEqual([
      { index: 0, startDate: '2026-01-01', endDate: '2026-02-15', dueDate: '2026-01-01' },
    ]);
  });

  it('finds the period containing a day', () => {
    const periods = billingSchedule('2026-01-01', '2026-12-31', 'quarterly');
    expect(periodContaining(periods, '2026-05-10')?.index).toBe(1);
    expect(periodContaining(periods, '2027-01-01')).toBeNull();
  });
});

describe('contractExpiryNotice', () => {
  it('words the warning before and after the end date', () => {
    expect(
      contractExpiryNotice({ status: 'expiring', contractNumber: 'C-1', endDate: '2026-11-01' }),
    ).toContain('ends on 2026-11-01');
    expect(
      contractExpiryNotice({ status: 'expired', contractNumber: 'C-1', endDate: '2026-11-01' }),
    ).toContain('ended on 2026-11-01');
  });
});
