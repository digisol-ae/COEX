import type { Metadata, Viewport } from 'next';
import { getSignedInUser } from '@/lib/session';
import { InstallProvider } from '@/components/pwa/install-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Worktello',
  description: 'DigiSol business platform: CRM foundation, tasks, time and support tickets.',
  applicationName: 'Worktello',
  appleWebApp: { capable: true, title: 'Worktello', statusBarStyle: 'default' },
};

export const viewport: Viewport = { themeColor: '#0c213d' };

/**
 * The theme is set on the server from the person's account, so a page never flashes in the wrong
 * colours first. Signed-out pages use Sunset, the original look.
 */
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSignedInUser();

  return (
    <html lang="en" data-theme={user?.theme ?? 'sunset'}>
      <body className="min-h-screen antialiased">
        <InstallProvider>{children}</InstallProvider>
      </body>
    </html>
  );
}
