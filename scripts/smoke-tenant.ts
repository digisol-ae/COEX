import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { TenantModel } from '../src/modules/core/models/tenant.model';
import { UserModel } from '../src/modules/core/models/user.model';
import { SpaceModel } from '../src/modules/tasks/models/space.model';
import { FolderModel } from '../src/modules/tasks/models/folder.model';
import { QueueModel, DEFAULT_TARGETS } from '../src/modules/tickets/models/queue.model';
import { hashPassword } from '../src/lib/password';

/**
 * A throwaway tenant for checking that screens render.
 *
 * Its own tenant rather than a user inside DigiSol, so nothing it creates appears in real lists,
 * real counts or the real audit trail, and removing it removes everything it touched. The password
 * is printed once and nowhere else.
 *
 *   npx tsx --env-file=.env.local scripts/smoke-tenant.ts
 *   npx tsx --env-file=.env.local scripts/smoke-tenant.ts --remove
 */

const SLUG = 'smoke';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set. Run with --env-file=.env.local');

  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB ?? 'coex_dev' });

  const removing = process.argv.includes('--remove');
  const tenant = await TenantModel.findOne({ slug: SLUG });

  if (removing) {
    if (!tenant) {
      console.log('Nothing to remove.');
    } else {
      const database = mongoose.connection.db;

      for (const collection of await database!.collections()) {
        const result = await collection.deleteMany({ tenantId: tenant._id });
        if (result.deletedCount > 0)
          console.log(`${collection.collectionName}: ${result.deletedCount}`);
      }

      await TenantModel.deleteOne({ _id: tenant._id });
      console.log('Removed the smoke tenant.');
    }

    await mongoose.disconnect();
    return;
  }

  const password = randomBytes(9).toString('base64url');

  const existing =
    tenant ??
    (await TenantModel.create({
      name: 'Smoke test',
      slug: SLUG,
      timezone: 'Asia/Dubai',
      currency: 'AED',
      numbering: { taskPrefix: 'SMK-T', ticketPrefix: 'SMK-S' },
    }));

  await UserModel.deleteMany({ tenantId: existing._id });

  const admin = await UserModel.create({
    tenantId: existing._id,
    email: 'smoke@example.test',
    name: 'Smoke Tester',
    role: 'tenant_admin',
    passwordHash: await hashPassword(password),
    mustChangePassword: false,
    status: 'active',
  });

  if (!(await QueueModel.findOne({ tenantId: existing._id }))) {
    await QueueModel.create({
      tenantId: existing._id,
      name: 'General support',
      isDefault: true,
      status: 'active',
      targets: DEFAULT_TARGETS,
    });
  }

  let space = await SpaceModel.findOne({ tenantId: existing._id });

  if (!space) {
    space = await SpaceModel.create({
      tenantId: existing._id,
      name: 'Implementation',
      description: 'A space to look at.',
      ownerId: admin._id,
    });

    await FolderModel.create([
      { tenantId: existing._id, spaceId: space._id, name: 'Discovery', sortOrder: 10 },
      {
        tenantId: existing._id,
        spaceId: space._id,
        name: 'Commercials',
        memberIds: [admin._id],
        sortOrder: 20,
      },
    ]);
  }

  console.log('Sign in at http://localhost:3100/login');
  console.log('  email    smoke@example.test');
  console.log('  password', password);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
