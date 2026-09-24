import type { NextConfig } from 'next';

/**
 * turbopack.root pins the project root to this folder. Without it Next.js walks up the directory
 * tree, finds a stray package-lock.json in the home folder and warns that the root is ambiguous.
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
  // A phone on the same Wi-Fi reaches the development server by the Mac's LAN address rather
  // than localhost. Keep that temporary address in .env.local, never in source control.
  allowedDevOrigins: process.env.COEX_DEV_ORIGIN ? [process.env.COEX_DEV_ORIGIN] : undefined,
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '30mb',
    },
  },
};

export default nextConfig;
