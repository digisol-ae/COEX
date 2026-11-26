/** Run with the deployed runtime/env and --tsconfig tsconfig.json. Defaults to preview only. */
import mongoose from 'mongoose';
import { parseArgs } from 'node:util';
import { UserModel } from '@coex/shared/core/models/user.model';
import { connectToDatabase } from '@/lib/db';
import { runWithContext } from '@/lib/tenant-context';
import { reconcileStorageUsage } from '@/modules/core/services/storage-reconciliation.service';

async function main() {
  const { values } = parseArgs({
    options: {
      tenant: { type: 'string' },
      actor: { type: 'string' },
      reason: { type: 'string' },
      apply: { type: 'boolean', default: false },
    },
  });
  if (!values.tenant || !values.actor || !/^[a-f\d]{24}$/i.test(values.actor))
    throw new Error(
      'Specify --tenant <id> --actor <existing platform owner id> [--apply --reason "..."]',
    );
  await connectToDatabase();
  const actor = await UserModel.findOne({
    _id: values.actor,
    role: 'platform_admin',
    status: 'active',
    deletedAt: null,
  });
  if (!actor) throw new Error('An active platform owner is required.');
  const result = await runWithContext(
    { tenantId: actor.tenantId, userId: actor._id, isPlatformAdmin: true },
    () =>
      reconcileStorageUsage({
        tenantId: values.tenant!,
        apply: values.apply,
        reason: values.reason,
      }),
  );
  console.log(JSON.stringify(result));
}
main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Reconciliation failed.');
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
