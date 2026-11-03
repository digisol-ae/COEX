import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Worktello',
    short_name: 'Worktello',
    description: 'Your workspace for customers, tasks, time and support.',
    start_url: '/login',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0c213d',
    icons: [
      { src: '/brand/pwa-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/pwa-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/brand/pwa-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
