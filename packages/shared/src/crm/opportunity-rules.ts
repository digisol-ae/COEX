/**
 * Pure rules for the pipeline and opportunities, free of the database so they can be tested alone.
 */

export type StageKind = 'open' | 'won' | 'lost';
export type OpportunityStatus = 'open' | 'won' | 'lost';

/** The starting pipeline (John, 10 Oct 2026: the proposed stages are right). */
export const DEFAULT_STAGES: { name: string; kind: StageKind; probability: number }[] = [
  { name: 'Qualified', kind: 'open', probability: 20 },
  { name: 'Needs analysis', kind: 'open', probability: 40 },
  { name: 'Proposal sent', kind: 'open', probability: 60 },
  { name: 'Negotiation', kind: 'open', probability: 80 },
  { name: 'Won', kind: 'won', probability: 100 },
  { name: 'Lost', kind: 'lost', probability: 0 },
];

/** An outcome is decided by the stage's kind, never by its name. */
export function statusForStage(kind: StageKind): OpportunityStatus {
  return kind;
}

export function clampProbability(value: number): number {
  return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
}

/** An open deal with no next step is flagged, so nothing sits without an owner knowing what is next. */
export function lacksNextStep(opportunity: { status: OpportunityStatus; nextStep: string | null }) {
  return opportunity.status === 'open' && !opportunity.nextStep?.trim();
}

export function nextStepOverdue(
  opportunity: { status: OpportunityStatus; nextStepDate: string | null },
  today: string,
): boolean {
  return (
    opportunity.status === 'open' && !!opportunity.nextStepDate && opportunity.nextStepDate < today
  );
}

export interface MoneyLine {
  currency: string;
  oneOffMinorUnits: number;
  recurringMinorUnits: number;
  count: number;
}

/** Totals per currency. Different currencies are never added together and nothing is converted. */
export function totalsByCurrency(
  opportunities: { currency: string; oneOffMinorUnits: number; recurringMinorUnits: number }[],
): MoneyLine[] {
  const totals = new Map<string, MoneyLine>();

  for (const opportunity of opportunities) {
    const line = totals.get(opportunity.currency) ?? {
      currency: opportunity.currency,
      oneOffMinorUnits: 0,
      recurringMinorUnits: 0,
      count: 0,
    };
    line.oneOffMinorUnits += opportunity.oneOffMinorUnits;
    line.recurringMinorUnits += opportunity.recurringMinorUnits;
    line.count += 1;
    totals.set(opportunity.currency, line);
  }

  return [...totals.values()].sort((a, b) => a.currency.localeCompare(b.currency));
}

export const DEFAULT_STALE_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** No activity for the configured number of days. Pure, so the reminder rule needs no database. */
export function isStale(lastActivityAt: Date, now: Date, staleDays: number): boolean {
  return now.getTime() - lastActivityAt.getTime() >= staleDays * DAY_MS;
}
