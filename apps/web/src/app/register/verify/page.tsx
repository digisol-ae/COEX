import { AuthShell } from '../../login/auth-shell';
import { VerifyApplicationForm } from '../forms';
export const metadata = {
  title: 'Verify your trial email · Worktello',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
};
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <AuthShell
      title="Verify your email"
      intro="Confirm that you requested a Worktello company trial. This submits your application for review."
    >
      <VerifyApplicationForm token={(await searchParams).token ?? ''} />
    </AuthShell>
  );
}
