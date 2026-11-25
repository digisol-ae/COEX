/** Commercial rules stay independent of the payment provider. GB uses decimal bytes. */
export const DEFAULT_STORAGE_LIMIT_BYTES = 2_000_000_000;
export const DEFAULT_TRIAL_DAYS = 30;
export const DAY_MS = 86_400_000;

export interface WorkspaceCommercial {
  status?: string | null;
  trialEndsAt?: Date | null;
  accessEndsAt?: Date | null;
}

export function workspaceAccess(
  status: string,
  commercial?: WorkspaceCommercial | null,
  now = new Date(),
): 'allowed' | 'suspended' | 'trial_expired' | 'subscription_expired' {
  if (status !== 'active') return 'suspended';
  // Existing customers have no commercial status and retain their existing access.
  if (!commercial?.status || commercial.status === 'legacy') return 'allowed';
  if (commercial.status === 'trialing')
    return commercial.trialEndsAt && commercial.trialEndsAt.getTime() > now.getTime()
      ? 'allowed'
      : 'trial_expired';
  if (commercial.status === 'active')
    return !commercial.accessEndsAt || commercial.accessEndsAt.getTime() > now.getTime()
      ? 'allowed'
      : 'subscription_expired';
  return 'subscription_expired';
}

export function positiveInteger(value: number, label: string, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum)
    throw new Error(`${label} must be a whole number between 1 and ${maximum}.`);
  return value;
}

export function formatStorage(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${Number((bytes / 1_000_000_000).toFixed(2))} GB`;
  if (bytes >= 1_000_000) return `${Number((bytes / 1_000_000).toFixed(2))} MB`;
  return `${bytes} bytes`;
}

export function formatPlanPrice(terms: {
  currency: string;
  amountMinor: number;
  fractionDigits: number;
  interval: string;
}) {
  return `${new Intl.NumberFormat('en', { style: 'currency', currency: terms.currency, minimumFractionDigits: terms.fractionDigits, maximumFractionDigits: terms.fractionDigits }).format(terms.amountMinor / 10 ** terms.fractionDigits)} / ${terms.interval}`;
}
