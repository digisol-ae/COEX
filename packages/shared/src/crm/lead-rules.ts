/**
 * Pure rules for leads, kept free of the database so they can be tested on their own.
 */

export type LeadStatus = 'new' | 'working' | 'converted' | 'disqualified';

/** A converted or disqualified lead is finished; only the two earlier states are worked on. */
export function isOpenLead(status: LeadStatus): boolean {
  return status === 'new' || status === 'working';
}

/** Company names compared without case, spacing or the usual legal suffix, so "Acme LLC" meets "ACME". */
export function normaliseCompany(name: string | null | undefined): string {
  return (
    (name ?? '')
      .toLowerCase()
      // Dots and apostrophes vanish rather than split, so "L.L.C." becomes "llc".
      .replace(/[.'’]/g, '')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(
        (word) => word && !['llc', 'ltd', 'limited', 'fze', 'fzco', 'inc', 'pvt'].includes(word),
      )
      .join(' ')
  );
}

export interface DuplicateProbe {
  email?: string | null;
  mobile?: string | null;
  company?: string | null;
}

export type DuplicateReason = 'email' | 'mobile' | 'company';

/** Which of a lead's identifying details match another record's. Empty values never match. */
export function duplicateReasons(probe: DuplicateProbe, other: DuplicateProbe): DuplicateReason[] {
  const reasons: DuplicateReason[] = [];
  const email = probe.email?.trim().toLowerCase();

  if (email && email === other.email?.trim().toLowerCase()) reasons.push('email');
  if (probe.mobile && probe.mobile === other.mobile) reasons.push('mobile');

  const company = normaliseCompany(probe.company);
  if (company && company === normaliseCompany(other.company)) reasons.push('company');

  return reasons;
}
