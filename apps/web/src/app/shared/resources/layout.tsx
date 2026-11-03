import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'Shared resources · Worktello',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};
export default function ResourcesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
