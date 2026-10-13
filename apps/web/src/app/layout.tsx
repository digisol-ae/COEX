import type { Metadata } from 'next';
import { getSignedInUser } from '@/lib/session';
import './globals.css';

export const metadata: Metadata = {
  title: 'COEX',
  description: 'DigiSol business platform: CRM foundation, tasks, time and support tickets.',
};

/**
 * The theme is set on the server from the person's account, so a page never flashes in the wrong
 * colours first. Signed-out pages use Sunset, the original look.
 */
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSignedInUser();

  return (
    <html lang="en" data-theme={user?.theme ?? 'sunset'}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
