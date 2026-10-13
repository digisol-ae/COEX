import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

/**
 * Starts the Next.js command line with the repository's settings files loaded.
 *
 * The app lives in apps/web, but .env (and .env.local on a developer's machine) stays at the
 * repository root, where the server, the workers and the API already read it. Next.js only looks in
 * its own folder, and Node refuses --env-file inside NODE_OPTIONS, so this small launcher reads the
 * root files first and then hands over to Next.js.
 *
 * Variables already in the environment win. .env.local is read before .env, so it overrides it, as
 * it does for the workers (`--env-file-if-exists=.env --env-file-if-exists=.env.local`).
 */
const repositoryRoot = path.resolve(import.meta.dirname, '../../..');

for (const name of ['.env.local', '.env']) {
  const file = path.join(repositoryRoot, name);
  if (existsSync(file)) process.loadEnvFile(file);
}

// Next.js reads its command and flags from process.argv exactly as if it had been started directly.
const nextCommandLine = createRequire(import.meta.url).resolve('next/dist/bin/next');
process.argv = [process.argv[0], nextCommandLine, ...process.argv.slice(2)];
await import(nextCommandLine);
