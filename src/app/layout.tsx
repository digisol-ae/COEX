import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DigiSol ECO',
  description: 'DigiSol business platform: CRM foundation, tasks, time and support tickets.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
