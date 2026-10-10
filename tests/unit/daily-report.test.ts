import { describe, expect, it } from 'vitest';
import {
  agentEmail,
  classifyDay,
  gulfNow,
  hoursText,
  isWorkingDay,
  previousDayKey,
  summaryEmail,
} from '@/modules/time/daily-report';

describe('daily report rules', () => {
  it('reads the Gulf date and hour, four hours ahead of UTC', () => {
    expect(gulfNow(new Date('2026-10-09T05:30:00Z'))).toEqual({ dayKey: '2026-10-09', hour: 9 });
    expect(gulfNow(new Date('2026-10-09T21:00:00Z'))).toEqual({ dayKey: '2026-10-10', hour: 1 });
  });

  it('finds the previous day and whether it was a working day', () => {
    expect(previousDayKey('2026-10-01')).toBe('2026-09-30');
    const week = [1, 2, 3, 4, 5];
    expect(isWorkingDay('2026-10-09', week)).toBe(true); // Friday
    expect(isWorkingDay('2026-10-10', week)).toBe(false); // Saturday
    expect(isWorkingDay('2026-10-11', week)).toBe(false); // Sunday
  });

  it('classifies a day against the minimum', () => {
    expect(classifyDay(0, 360)).toBe('none');
    expect(classifyDay(200, 360)).toBe('below');
    expect(classifyDay(360, 360)).toBe('met');
    expect(hoursText(450)).toBe('7h 30m');
    expect(hoursText(120)).toBe('2h');
  });

  it('thanks a full day and politely encourages the rest', () => {
    const day = '2026-10-08';
    const met = agentEmail(day, { name: 'Fatima Noor', minutes: 420, items: 3 }, 360);
    expect(met.text).toContain('Thank you');
    expect(met.text).toContain('7h');

    const below = agentEmail(day, { name: 'Fatima Noor', minutes: 120, items: 1 }, 360);
    expect(below.text).toContain('honest');
    expect(below.text).not.toMatch(/fail|disciplin|penal/i);

    const none = agentEmail(day, { name: 'Fatima Noor', minutes: 0, items: 0 }, 360);
    expect(none.text).toContain('could not see any time');
    expect(none.text).toContain('honest');
  });

  it('summarises everyone, most hours first', () => {
    const summary = summaryEmail(
      '2026-10-08',
      [
        { name: 'A', minutes: 0, items: 0 },
        { name: 'B', minutes: 400, items: 2 },
      ],
      360,
    );
    expect(summary.subject).toContain('Thursday 8 October');
    expect(summary.text.indexOf('B:')).toBeLessThan(summary.text.indexOf('A:'));
    expect(summary.text).toContain('1 met it, 0 below it, 1 logged nothing');
  });
});
