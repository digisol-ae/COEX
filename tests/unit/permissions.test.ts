import { describe, expect, it } from 'vitest';
import { can, permissionsFor } from '@/modules/core/permissions';

/**
 * These exist because of a bug found by opening the product and looking at it: a tenant
 * administrator could not open their own task list or their own timesheet, because the role
 * granted task.read.all and nobody had written task.read.own beside it.
 */
describe('permissions', () => {
  it('lets anyone who can see every task see their own', () => {
    for (const role of ['platform_admin', 'tenant_admin', 'manager'] as const) {
      expect(can({ role }, 'task.read.own')).toBe(true);
      expect(can({ role }, 'ticket.read.own')).toBe(true);
    }
  });

  it('does not work the other way round', () => {
    expect(can({ role: 'agent' }, 'task.read.own')).toBe(true);
    expect(can({ role: 'agent' }, 'task.read.all')).toBe(false);
  });

  it('applies an implication to a granted permission too, not only to the role', () => {
    const granted = permissionsFor({
      role: 'client_contact',
      permissionGrants: ['task.read.all'],
    });

    expect(granted.has('task.read.own')).toBe(true);
  });

  it('lets a denial win over an implication', () => {
    const granted = permissionsFor({
      role: 'manager',
      permissionDenials: ['task.read.own'],
    });

    expect(granted.has('task.read.all')).toBe(true);
    expect(granted.has('task.read.own')).toBe(false);
  });

  it('keeps a client contact to their own tickets and nothing else', () => {
    const granted = permissionsFor({ role: 'client_contact' });

    expect([...granted]).toEqual(['ticket.read.own']);
  });
});
