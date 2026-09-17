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
    env: {
      MONGODB_URI: environment.MONGODB_URI ?? '',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
});
