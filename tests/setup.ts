import mongoose from 'mongoose';

/**
 * Connects to a separate database so a test run can never touch development or production data.
 * The name is forced here rather than taken from the environment, so a mistyped variable cannot
 * point the suite at real records.
 */

const TEST_DATABASE = 'coex_test';

export async function connectForTests() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not set. Run the suite with npm test so .env.local is loaded.');
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, { dbName: TEST_DATABASE });
  }

  if (mongoose.connection.name !== TEST_DATABASE) {
    throw new Error(`Refusing to run tests against ${mongoose.connection.name}.`);
  }

  return mongoose.connection;
}

export async function clearDatabase() {
  const connection = await connectForTests();
  const collections = await connection.db!.collections();

  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export async function disconnectFromTests() {
  await mongoose.disconnect();
}
