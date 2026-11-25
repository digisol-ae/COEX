import { describe, expect, it } from 'vitest';
import { DEFAULT_STORAGE_LIMIT_BYTES, workspaceAccess } from '@coex/shared/core/saas';
import { permissionsFor } from '@coex/shared/core/permissions';

describe('SaaS access rules', () => {
  const now = new Date('2026-11-25T10:00:00Z');
  it('defaults to 2 GB and preserves existing tenant access', () => {
    expect(DEFAULT_STORAGE_LIMIT_BYTES).toBe(2_000_000_000);
    expect(workspaceAccess('active', undefined, now)).toBe('allowed');
    expect(workspaceAccess('active', { status: 'legacy' }, now)).toBe('allowed');
  });
  it('expires a trial at the exact boundary and fails closed for a missing expiry', () => {
    expect(
      workspaceAccess(
        'active',
        { status: 'trialing', trialEndsAt: new Date(now.getTime() + 1) },
        now,
      ),
    ).toBe('allowed');
    expect(workspaceAccess('active', { status: 'trialing', trialEndsAt: now }, now)).toBe(
      'trial_expired',
    );
    expect(workspaceAccess('active', { status: 'trialing' }, now)).toBe('trial_expired');
  });
  it('checks suspension before commercial access', () => {
    expect(workspaceAccess('suspended', { status: 'active' }, now)).toBe('suspended');
  });
  it('checks subscription end dates and rejects unknown or unpaid states', () => {
    expect(workspaceAccess('active', { status: 'active', accessEndsAt: now }, now)).toBe(
      'subscription_expired',
    );
    for (const status of ['past_due', 'expired', 'canceled', 'unexpected'])
      expect(workspaceAccess('active', { status }, now)).toBe('subscription_expired');
  });
  it('does not grant platform powers through permission overrides', () => {
    expect(
      permissionsFor({ role: 'tenant_admin', permissionGrants: ['tenant.create'] }).has(
        'tenant.create',
      ),
    ).toBe(false);
  });
});
