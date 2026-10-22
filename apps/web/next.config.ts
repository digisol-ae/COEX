import { existsSync } from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * The app lives in apps/web, but the settings file (.env, and .env.local on a developer's machine)
 * stays at the repository root, where the server, the workers and the API already read it. The
 * launcher bin/run-next.mjs loads those files before starting Next.js, because Next.js only looks
 * in its own folder.
 */
const repositoryRoot = existsSync(path.resolve(process.cwd(), '../../packages/shared'))
  ? path.resolve(process.cwd(), '../..')
  : process.cwd();

/**
 * turbopack.root pins the project root to the repository root, not to apps/web: the shared package
 * and node_modules live there, and Turbopack must be able to read them. It also stops Next.js
 * walking up the directory tree, finding a stray package-lock.json in the home folder and warning
 * that the root is ambiguous.
 *
 * experimental.serverActions.bodySizeLimit raises Next's own request ceiling for anything
 * submitted through a Server Action, ticket attachments included. Next's default is 1MB, which a
 * single photo from a phone already clears; the application's own caps of 3MB per file and 10MB per message, and the
 * server-side image resize and re-encode on the way in, are unrelated and already handle a large
 * attachment sensibly once the request is allowed to arrive at all. 30MB comfortably covers one
 * large file plus a few smaller ones in the same ticket, with room to raise it further if a
 * genuine need for something larger shows up.
 */
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/integrations/teams/create',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://teams.microsoft.com https://*.teams.microsoft.com https://*.cloud.microsoft https://*.skype.com",
          },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
  // A phone on the same Wi-Fi reaches the development server by the Mac's LAN address rather
  // than localhost. Keep that temporary address in .env.local, never in source control.
  allowedDevOrigins: process.env.COEX_DEV_ORIGIN ? [process.env.COEX_DEV_ORIGIN] : undefined,
  // The shared package ships TypeScript source, so Next compiles it with the app.
  transpilePackages: ['@coex/shared'],
  turbopack: {
    root: repositoryRoot,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '30mb',
    },
  },
};

export default nextConfig;
