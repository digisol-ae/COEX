import mongoose from 'mongoose';

/**
 * Each test file gets its own database.
 *
 * The suite used to share one, and relied on vitest running files one at a time. That held until
 * the files were reorganised, and then one file cleared the database while another was mid test,
 * producing failures that looked like application bugs and were not. Isolation is now structural:
 * a file names its own database, so nothing another file does can reach it, whatever the runner
 * decides about parallelism.
 *
 * The name is forced here rather than taken from the environment, so a mistyped variable cannot
 * point the suite at real records.
 */

const PREFIX = 'coex_test_';

export async function connectForTests(suiteName: string) {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not set. Run the suite with npm test so .env.local is loaded.');
  }

  const dbName = `${PREFIX}${suiteName}`;

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, { dbName });
  }

  if (!mongoose.connection.name?.startsWith(PREFIX)) {
    throw new Error(`Refusing to run tests against ${mongoose.connection.name}.`);
  }

  return mongoose.connection;
}

export async function clearDatabase() {
  const connection = mongoose.connection;

  if (!connection.name?.startsWith(PREFIX)) {
    throw new Error(`Refusing to clear ${connection.name}.`);
  }

  const collections = await connection.db!.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export async function disconnectFromTests() {
  await mongoose.disconnect();
}
