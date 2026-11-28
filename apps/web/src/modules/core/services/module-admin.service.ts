import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { TimeEntryModel } from '@coex/shared/time/models/time-entry.model';
import { AuditLogModel } from '@coex/shared/core/models/audit-log.model';
import { MODULES, effectiveModules, type ModuleAllowance } from '@coex/shared/core/modules';
import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { requirePlatformAdministrator } from './platform-access.service';
import { lockSubscription } from './subscription.service';
import type { ClientSession } from 'mongoose';
export function validateModules(modules: ModuleAllowance) {
  if (
    !modules ||
    Object.keys(modules).some((key) => !(MODULES as readonly string[]).includes(key)) ||
    MODULES.some(
      (key) =>
        typeof modules[key] !== 'boolean' && !(key === 'payroll' && modules[key] === undefined),
    )
  )
    throw new Error('Choose an allowance for each module.');
}
/** Refuse to strand running timers. Staff must stop them before the owner disables access. */
export async function assertNoStrandedTimers(
  tenantId: string,
  modules: ModuleAllowance,
  session: ClientSession,
) {
  if (!modules.tasks || !modules.tickets) {
    if (
      await TimeEntryModel.exists({
        tenantId,
        deletedAt: null,
        running: true,
        ...(!modules.tasks ? {} : { ticketId: { $ne: null } }),
      }).session(session)
    )
      throw new Error('Stop running timers in the affected modules before disabling access.');
  }
}
export async function setTenantModules(tenantId: string, modules: ModuleAllowance, reason: string) {
  await requirePlatformAdministrator();
  validateModules(modules);
  if (!reason.trim() || reason.length > 500)
    throw new Error('Enter a reason of at most 500 characters.');
  const db = await connectToDatabase();
  const context = getContext();
  await db.connection.transaction(async (session) => {
    const tenant = await lockSubscription(tenantId, session);
    const effective = effectiveModules({ modules, commercial: tenant.commercial });
    await assertNoStrandedTimers(tenantId, effective, session);
    await TenantModel.updateOne({ _id: tenant._id }, { $set: { modules } }, { session });
    await AuditLogModel.create(
      [
        {
          tenantId: context.tenantId,
          actorId: context.userId,
          action: 'tenant.modules_updated',
          entityType: 'Tenant',
          entityId: tenant._id,
          before: tenant.modules,
          after: { modules, effective, reason: reason.trim() },
        },
      ],
      { session },
    );
  });
}
