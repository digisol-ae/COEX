import { describe, expect, it } from 'vitest';
import { buildActivityReport, safeText } from '@/modules/time/activity-report';

describe('activity report', () => {
  it('makes a PDF, including more rows than fit on one page', async () => {
    const rows = Array.from({ length: 80 }, (_, index) => ({
      userName: index % 2 ? 'Syed Ali' : 'Fatima Noor',
      kind: index % 3 ? ('task' as const) : ('ticket' as const),
      number: `DGS-T-${index}`,
      title: 'A fairly long task title '.repeat(6),
      stage: 'In progress',
      minutes: 30 + index,
      running: index === 0,
      lastWorked: '9 Oct, 10:00',
    }));

    const bytes = await buildActivityReport({
      title: 'Team activity',
      periodLabel: '9 Oct 2026',
      filtersLabel: 'Everyone',
      generatedBy: 'John',
      generatedAt: '9 Oct 2026',
      rows,
    });

    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
    expect(bytes.byteLength).toBeGreaterThan(2000);
  });

  it('does not fail on names the standard fonts cannot draw, and handles no rows', async () => {
    expect(safeText('علی Ali')).toBe('??? Ali');
    const bytes = await buildActivityReport({
      title: 'T',
      periodLabel: 'P',
      filtersLabel: 'F',
      generatedBy: 'علی',
      generatedAt: 'now',
      rows: [],
    });
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
