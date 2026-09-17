import type { NextConfig } from 'next';

/**
 * turbopack.root pins the project root to this folder. Without it Next.js walks up the directory
 * tree, finds a stray package-lock.json in the home folder and warns that the root is ambiguous.
 */
const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
