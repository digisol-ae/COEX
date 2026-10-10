import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STAGES,
  clampProbability,
  lacksNextStep,
  nextStepOverdue,
  statusForStage,
  totalsByCurrency,
} from '@/modules/crm/opportunity-rules';

describe('opportunity rules', () => {
  it('starts with the agreed stages and exactly one won and one lost', () => {
    expect(DEFAULT_STAGES.map((stage) => stage.name)).toEqual([
      'Qualified',
      'Needs analysis',
      'Proposal sent',
      'Negotiation',
      'Won',
      'Lost',
    ]);
    expect(DEFAULT_STAGES.filter((stage) => stage.kind === 'won')).toHaveLength(1);
    expect(DEFAULT_STAGES.filter((stage) => stage.kind === 'lost')).toHaveLength(1);
  });

  it('decides the outcome from the stage kind, not its name', () => {
    expect(statusForStage('won')).toBe('won');
    expect(statusForStage('lost')).toBe('lost');
    expect(statusForStage('open')).toBe('open');
  });

  it('keeps a probability between 0 and 100', () => {
    expect(clampProbability(150)).toBe(100);
    expect(clampProbability(-5)).toBe(0);
    expect(clampProbability(Number.NaN)).toBe(0);
    expect(clampProbability(42.6)).toBe(43);
  });

  it('flags only open deals that lack a next step or are overdue', () => {
    expect(lacksNextStep({ status: 'open', nextStep: ' ' })).toBe(true);
    expect(lacksNextStep({ status: 'open', nextStep: 'Call' })).toBe(false);
    expect(lacksNextStep({ status: 'won', nextStep: null })).toBe(false);
    expect(nextStepOverdue({ status: 'open', nextStepDate: '2026-10-01' }, '2026-10-09')).toBe(
      true,
    );
    expect(nextStepOverdue({ status: 'open', nextStepDate: '2026-10-09' }, '2026-10-09')).toBe(
      false,
    );
    expect(nextStepOverdue({ status: 'lost', nextStepDate: '2026-10-01' }, '2026-10-09')).toBe(
      false,
    );
  });

  it('totals per currency and never adds across currencies', () => {
    const totals = totalsByCurrency([
      { currency: 'AED', oneOffMinorUnits: 100, recurringMinorUnits: 10 },
      { currency: 'USD', oneOffMinorUnits: 500, recurringMinorUnits: 0 },
      { currency: 'AED', oneOffMinorUnits: 50, recurringMinorUnits: 5 },
    ]);

    expect(totals).toEqual([
      { currency: 'AED', oneOffMinorUnits: 150, recurringMinorUnits: 15, count: 2 },
      { currency: 'USD', oneOffMinorUnits: 500, recurringMinorUnits: 0, count: 1 },
    ]);
  });
});
