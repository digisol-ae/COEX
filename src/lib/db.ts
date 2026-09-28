import mongoose from 'mongoose';

/**
 * Cached MongoDB connection.
 *
 * Next.js reloads modules on every request in development, which would otherwise open a new
 * connection each time and exhaust the Atlas connection limit. The connection is therefore cached
 * on globalThis and reused.
 */

interface MongooseCache {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var __coexMongoose: MongooseCache | undefined;
}

const cache: MongooseCache = globalThis.__coexMongoose ?? { connection: null, promise: null };
globalThis.__coexMongoose = cache;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.connection) {
    return cache.connection;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.');
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 10,
    });
  }

  try {
    cache.connection = await cache.promise;
  } catch (error) {
    // Forget the failed attempt, or every later request would reuse it and fail too, and the app
    // would stay down after the network came back until someone restarted it (found 28 Sep 2026).
    cache.promise = null;
    throw error;
  }
  return cache.connection;
}
