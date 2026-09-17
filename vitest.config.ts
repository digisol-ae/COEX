import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Tests run against a real MongoDB database named coex_test rather than an in memory stand in,
 * because the behaviour under test is how MongoDB applies our filters. A fake would prove nothing.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
});
