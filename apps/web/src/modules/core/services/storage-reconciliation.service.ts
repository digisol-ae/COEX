import mongoose from 'mongoose';
import { lstat, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { TenantModel } from '@coex/shared/core/models/tenant.model';
import { withStorageReconciliation } from '@/lib/storage-maintenance';
import { requirePlatformAdministrator } from './platform-access.service';
import { recordAudit } from './audit.service';

async function measuredBytes(path: string): Promise<number> {
  const info = await lstat(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!info) return 0;
  if (info.isSymbolicLink())
    throw new Error('Storage contains a symbolic link; review it before reconciling.');
  if (info.isFile()) return info.size;
  if (!info.isDirectory()) throw new Error('Storage contains an unsupported file type.');
  let bytes = 0;
  for (const name of await readdir(path)) bytes += await measuredBytes(join(path, name));
  return bytes;
}

/** Counts retained/orphan files too; no file is removed or moved by reconciliation. */
export async function reconcileStorageUsage(input: {
  tenantId: string;
  apply?: boolean;
  reason?: string;
}) {
  await requirePlatformAdministrator();
  if (!/^[a-f\d]{24}$/i.test(input.tenantId)) throw new Error('Choose a valid workspace.');
  const reason = input.reason?.trim();
  if (input.apply && (!reason || reason.length > 500))
    throw new Error('Give a reason of 1–500 characters.');
  const root = resolve(/* turbopackIgnore: true */ process.env.STORAGE_DIR ?? '.storage');
  return withStorageReconciliation(root, async () => {
    const tenant = await TenantModel.findOne({ _id: input.tenantId, deletedAt: null });
    if (!tenant) throw new Error('Workspace not found.');
    const before = tenant.storageUsedBytes;
    const measured = await measuredBytes(join(root, input.tenantId));
    if (input.apply) {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const result = await TenantModel.updateOne(
            { _id: tenant._id, deletedAt: null, storageUsedBytes: before },
            { $set: { storageUsedBytes: measured } },
            { session },
          );
          if (result.matchedCount !== 1)
            throw new Error('Storage accounting changed. Preview again.');
          await recordAudit(
            {
              action: 'tenant.storage_reconciled',
              entityType: 'Tenant',
              entityId: tenant._id,
              before: { storageUsedBytes: before },
              after: { storageUsedBytes: measured, reason },
            },
            session,
          );
        });
      } finally {
        await session.endSession();
      }
    }
    return {
      tenantId: input.tenantId,
      recordedBytes: before,
      measuredBytes: measured,
      applied: !!input.apply,
    };
  });
}
