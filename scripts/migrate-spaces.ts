import mongoose from 'mongoose';

/**
 * One time migration: projects become spaces, phases become folders.
 *
 * Run once against a database written before the four level structure landed:
 *
 *   npx tsx --env-file=.env.local scripts/migrate-spaces.ts
 *
 * It is safe to run twice. Every step checks whether it has already happened, because a migration
 * that only works once is a migration nobody dares to run.
 */

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set. Run with --env-file=.env.local');

  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB ?? 'coex_dev' });

  const db = mongoose.connection.db;
  if (!db) throw new Error('No database connection.');

  const names = (await db.listCollections().toArray()).map((row) => row.name);

  if (names.includes('projects') && !names.includes('spaces')) {
    await db.collection('projects').rename('spaces');
    console.log('Renamed projects to spaces.');
  } else {
    console.log('Nothing to rename.');
  }

  // Phases were a field on the task; they become real folders, one per phase per space.
  const spaces = await db.collection('spaces').find({}).toArray();

  for (const space of spaces) {
    const phases: string[] = Array.isArray(space.phases) ? space.phases : [];

    for (const [index, phase] of phases.entries()) {
      const name = String(phase).trim();
      if (!name) continue;

      const existing = await db
        .collection('folders')
        .findOne({ tenantId: space.tenantId, spaceId: space._id, name });

      const folderId =
        existing?._id ??
        (
          await db.collection('folders').insertOne({
            tenantId: space.tenantId,
            spaceId: space._id,
            name,
            description: null,
            memberIds: [],
            sortOrder: (index + 1) * 10,
            status: 'active',
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ).insertedId;

      const moved = await db
        .collection('tasks')
        .updateMany(
          { tenantId: space.tenantId, projectId: space._id, phase: name },
          { $set: { folderId } },
        );

      console.log(`${space.name}: ${name} became a folder, carrying ${moved.modifiedCount} tasks.`);
    }
  }

  const tasks = await db
    .collection('tasks')
    .updateMany({ projectId: { $exists: true } }, [
      { $set: { spaceId: '$projectId', folderId: { $ifNull: ['$folderId', null] } } },
      { $unset: ['projectId', 'phase'] },
    ]);

  console.log(`Moved ${tasks.modifiedCount} tasks onto spaceId.`);

  const entries = await db
    .collection('timeentries')
    .updateMany({ projectId: { $exists: true } }, [
      { $set: { spaceId: '$projectId' } },
      { $unset: ['projectId'] },
    ]);

  console.log(`Moved ${entries.modifiedCount} time entries onto spaceId.`);

  await db
    .collection('spaces')
    .updateMany({ phases: { $exists: true } }, { $unset: { phases: '' } });

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
