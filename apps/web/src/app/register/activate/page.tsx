import { AuthShell } from '../../login/auth-shell';
import { Notice } from '@/components/ui';
import { trialActivationValid } from '@/modules/core/services/trial-registration.service';
import { TrialActivationForm, ResendTrialActivation } from '../forms';
export const metadata = {
  title: 'Activate your workspace · Worktello',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
};
export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token ?? '';
  const valid = await trialActivationValid(token);
  return (
    <AuthShell
      title="Activate your administrator account"
      intro="After your application is approved, choose a password to access your company workspace."
    >
      {valid ? (
        <TrialActivationForm token={token} />
      ) : (
        <>
          <div className="mt-7">
            <Notice>
              This link is missing, expired or already used. Request a new link if your approved
              account still needs activation.
            </Notice>
          </div>
          <ResendTrialActivation />
        </>
      )}
    </AuthShell>
  );
}
