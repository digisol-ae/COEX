import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Tests run against a real MongoDB database named coex_test rather than an in memory stand in,
 * because the behaviour under test is how MongoDB applies our filters. A fake would prove nothing.
 *
 * Vitest does not accept Node's --env-file flag, so .env.local is read here and handed to the test
 * environment. Only the values the suite needs are passed through.
 */

function readEnvFile(file: string): Record<string, string> {
  try {
    const contents = readFileSync(path.resolve(import.meta.dirname, file), 'utf8');
    const values: Record<string, string> = {};

    for (const line of contents.split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match) continue;

      const [, key, rawValue] = match;
      values[key] = rawValue.replace(/^["']|["']$/g, '');
    }

    return values;
  } catch {
    return {};
  }
}

const environment = readEnvFile('.env.local');

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    // testTimeout does not cover beforeAll/beforeEach, whose default is 10 seconds. Every database
    // test clears and reseeds in beforeEach, so over a slow link to Atlas the setup timed out while
    // the tests themselves were fine (the four files that passed alone but failed in a full run).
    hookTimeout: 60000,
    env: {
      MONGODB_URI: environment.MONGODB_URI ?? '',
      // Optional. Point this at a MongoDB on the same machine (see tests/README.md) and the suite
      // stops paying a network round trip per query. Falls back to MONGODB_URI.
      MONGODB_TEST_URI: environment.MONGODB_TEST_URI ?? '',
      // Uploads in the suite go to their own directory, so a test run can never write into the
      // store a running development server is using.
      STORAGE_DIR: path.resolve(import.meta.dirname, '.storage-test'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
});
