import { OutlookCreateForm } from './outlook-create-form';
export const metadata = {
  title: 'Outlook email to task · Worktello',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
};
export default function Page() {
  return <OutlookCreateForm allowSample={process.env.NODE_ENV === 'development'} />;
}
