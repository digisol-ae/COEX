import Link from 'next/link';
import { Notice } from '@/components/ui';
import { resetLinkIsValid } from '@/modules/core/services/password-reset.service';
import { AuthShell } from '../login/auth-shell';
import { ResetForm } from './reset-form';

export const metadata = { title: 'Choose a new password · COEX' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token ?? '';
  const valid = token ? await resetLinkIsValid(token) : false;

  return (
    <AuthShell
      title="Choose a new password"
      intro="At least 12 characters. A few unrelated words make a password that is long, strong and easy to remember."
    >
      {valid ? (
        <ResetForm token={token} />
      ) : (
        <div className="mt-8 space-y-4">
          <Notice tone="warn">This link has expired or was already used.</Notice>
          <p className="text-center text-sm">
            <Link
              href="/forgot-password"
              className="text-[var(--color-ink-muted)] underline-offset-4 hover:text-[var(--color-ink)] hover:underline"
            >
              Ask for a new link
            </Link>
          </p>
        </div>
      )}
    </AuthShell>
  );
}
