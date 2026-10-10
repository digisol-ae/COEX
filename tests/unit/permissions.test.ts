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

  it('lets a senior agent see and assign all work without administering people or the tenant', () => {
    const granted = permissionsFor({ role: 'senior_agent' });

    for (const permission of [
      'ticket.read.all',
      'ticket.manage',
      'task.read.all',
      'task.manage',
    ] as const)
      expect(granted.has(permission)).toBe(true);
    for (const permission of [
      'user.manage',
      'tenant.manage',
      'audit.read',
      'desk.read.all',
      'timesheet.read.all',
    ] as const)
      expect(granted.has(permission)).toBe(false);

    expect(
      permissionsFor({ role: 'senior_agent', permissionGrants: ['timesheet.read.all'] }).has(
        'timesheet.read.all',
      ),
    ).toBe(true);
    expect(can({ role: 'manager' }, 'timesheet.read.all')).toBe(true);
  });

  it('keeps a client contact to their own tickets and nothing else', () => {
    const granted = permissionsFor({ role: 'client_contact' });

    expect([...granted]).toEqual(['ticket.read.own']);
  });
});

describe('lead permissions', () => {
  it('gives managers and administrators every lead permission, and agents none', () => {
    for (const role of ['tenant_admin', 'manager'] as const) {
      expect(can({ role }, 'lead.manage')).toBe(true);
      expect(can({ role }, 'lead.read.all')).toBe(true);
    }
    expect(can({ role: 'agent' }, 'lead.read')).toBe(false);
  });

  it('lets a person granted lead.manage see their own leads without a second grant', () => {
    expect(can({ role: 'agent', permissionGrants: ['lead.manage'] }, 'lead.read')).toBe(true);
    expect(can({ role: 'agent', permissionGrants: ['lead.manage'] }, 'lead.read.all')).toBe(false);
  });
});

describe('opportunity and pipeline permissions', () => {
  it('gives managers and administrators all four, and agents none', () => {
    for (const role of ['tenant_admin', 'manager'] as const) {
      for (const permission of [
        'opportunity.read',
        'opportunity.read.all',
        'opportunity.manage',
        'pipeline.manage',
      ] as const) {
        expect(can({ role }, permission)).toBe(true);
      }
    }
    expect(can({ role: 'agent' }, 'opportunity.read')).toBe(false);
  });

  it('lets a granted salesperson see and manage their own deals but not edit the pipeline', () => {
    const salesperson = { role: 'agent', permissionGrants: ['opportunity.manage'] } as const;
    expect(can(salesperson, 'opportunity.read')).toBe(true);
    expect(can(salesperson, 'opportunity.read.all')).toBe(false);
    expect(can(salesperson, 'pipeline.manage')).toBe(false);
  });
});
