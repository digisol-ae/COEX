import { TeamsCreateForm } from './create-form';

export const metadata = {
  title: 'Create COEX task',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
};

export default function TeamsCreatePage() {
  return <TeamsCreateForm />;
}
