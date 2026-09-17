/**
 * Connection check for the COEX database.
 *
 * Run it with `npm run check:db` on the machine that owns .env.local. It reports the server
 * version, the replica set name and the collection count without printing any credential.
 * Transactions need a replica set, so a missing set name is a real finding, not a detail.
 */

import { readFileSync } from 'node:fs';
import mongoose from 'mongoose';

const file = new URL('../.env.local', import.meta.url);
const uri = readFileSync(file, 'utf8').match(/^MONGODB_URI="(.+)"$/m)?.[1];

if (!uri || uri.includes('<db_password>')) {
  console.error('MONGODB_URI is missing or still holds the password placeholder in .env.local');
  process.exit(1);
}

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 });

  const status = await mongoose.connection.db.admin().serverStatus();
  const collections = await mongoose.connection.db.listCollections().toArray();

  console.log('Connected');
  console.log('  database    ', mongoose.connection.name);
  console.log('  server      ', status.version);
  console.log('  replica set ', status.repl?.setName ?? 'none, transactions will not work');
  console.log('  collections ', collections.length);

  await mongoose.disconnect();
} catch (error) {
  console.error('Connection failed:', error.message);
  process.exit(1);
}
