import { it, expect } from 'vitest';
import {
  ALL_MODULES,
  effectiveModules,
  modulePermissions,
  permissionModule,
} from '@coex/shared/core/modules';
import { permissionsFor } from '@coex/shared/core/permissions';
it('requires both plan and tenant allowance and preserves older snapshots', () => {
  expect(effectiveModules({})).toEqual(ALL_MODULES);
  expect(
    effectiveModules({
      modules: { tasks: false },
      commercial: { planSnapshot: { modules: { crm: false } } },
    }),
  ).toEqual({ tasks: false, tickets: true, crm: false });
});
it('masks role grants, implications and overrides while preserving foundations and account administration', () => {
  const permissions = modulePermissions(
    permissionsFor({
      role: 'tenant_admin',
      permissionGrants: ['teams.tasks.read.others', 'desk.read.all'],
    }),
    { tasks: false, tickets: false, crm: false },
  );
  for (const permission of permissions) expect(permissionModule(permission)).toBeNull();
  expect(permissions).toContain('customer.manage');
  expect(permissions).toContain('user.manage');
});
