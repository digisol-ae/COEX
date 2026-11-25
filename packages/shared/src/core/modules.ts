import type { Permission } from './permissions';
export const MODULES = ['tasks', 'tickets', 'crm'] as const;
export type WorkspaceModule = (typeof MODULES)[number];
export type ModuleAllowance = Record<WorkspaceModule, boolean>;
export const ALL_MODULES: ModuleAllowance = { tasks: true, tickets: true, crm: true };
export interface ModuleTenant {
  modules?: Partial<ModuleAllowance> | null;
  commercial?: { planSnapshot?: { modules?: Partial<ModuleAllowance> | null } | null } | null;
}
export function effectiveModules(tenant: ModuleTenant): ModuleAllowance {
  return Object.fromEntries(
    MODULES.map((key) => [
      key,
      tenant.modules?.[key] !== false && tenant.commercial?.planSnapshot?.modules?.[key] !== false,
    ]),
  ) as ModuleAllowance;
}
export function permissionModule(permission: string): WorkspaceModule | null {
  if (/^(task\.|timesheet\.|desk\.|teams\.tasks\.)/.test(permission)) return 'tasks';
  if (/^(ticket\.|resource\.)/.test(permission)) return 'tickets';
  if (/^(contract\.|lead\.|opportunity\.|pipeline\.|products\.)/.test(permission)) return 'crm';
  return null;
}
export function modulePermissions(
  permissions: Iterable<Permission>,
  modules: ModuleAllowance,
): Permission[] {
  return [...permissions].filter((permission) => {
    const requiredModule = permissionModule(permission);
    return !requiredModule || modules[requiredModule];
  });
}
