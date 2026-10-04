import { describe, expect, it } from 'vitest';
import {
  SAMPLE_CONTRACT_EMAIL_VALUES,
  defaultContractTemplate,
  fillContractTemplate,
} from '@/modules/crm/contract-email';
import {
  billingSchedule,
  contractExpiryNotice,
  daysBetween,
  deriveContractStatus,
  matchesContractFilter,
  needsExpiryWarning,
  parseContractFilter,
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

describe('matchesContractFilter', () => {
  const inForce = (status: 'active' | 'expiring' | 'expired', daysLeft: number) => ({
    status,
    daysLeft,
  });

  it('puts a contract in the 30 and 60 day filters by days left, today included', () => {
    expect(matchesContractFilter(inForce('expiring', 0), '30')).toBe(true);
    expect(matchesContractFilter(inForce('expiring', 30), '30')).toBe(true);
    expect(matchesContractFilter(inForce('active', 31), '30')).toBe(false);
    expect(matchesContractFilter(inForce('active', 45), '60')).toBe(true);
    expect(matchesContractFilter(inForce('active', 61), '60')).toBe(false);
  });

  it('keeps ended contracts out of the expiring filters and in expired', () => {
    expect(matchesContractFilter(inForce('expired', -1), '30')).toBe(false);
    expect(matchesContractFilter(inForce('expired', -1), 'expired')).toBe(true);
    expect(matchesContractFilter(inForce('active', 5), 'expired')).toBe(false);
  });

  it('matches the badge: due is the warning window or ended', () => {
    expect(matchesContractFilter(inForce('expiring', 10), 'due')).toBe(true);
    expect(matchesContractFilter(inForce('expired', -3), 'due')).toBe(true);
    expect(matchesContractFilter(inForce('active', 200), 'due')).toBe(false);
  });

  it('never matches an expiry filter for a contract that is not in force', () => {
    for (const filter of ['due', '30', '60', 'expired'] as const) {
      expect(matchesContractFilter({ status: 'draft', daysLeft: null }, filter)).toBe(false);
    }
    expect(matchesContractFilter({ status: 'draft', daysLeft: null }, 'all')).toBe(true);
  });

  it('reads the filter from the address and ignores nonsense', () => {
    expect(parseContractFilter('60')).toBe('60');
    expect(parseContractFilter('banana')).toBe('all');
    expect(parseContractFilter(undefined)).toBe('all');
  });
});

describe('fillContractTemplate', () => {
  it('fills known placeholders and leaves unknown ones visible', () => {
    expect(
      fillContractTemplate(
        'Dear {contact}, {contract_title} ends {end_date}. {nope}',
        SAMPLE_CONTRACT_EMAIL_VALUES,
      ),
    ).toBe('Dear Sara Khan, R4 Annual Support ends 2026-12-31. {nope}');
  });

  it('opens on the template that fits the contract', () => {
    expect(defaultContractTemplate('expired')).toBe('expired');
    expect(defaultContractTemplate('expiring')).toBe('renewal');
    expect(defaultContractTemplate('active')).toBe('general');
  });
});
