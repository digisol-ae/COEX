import Link from 'next/link';
import { AuthShell } from '../login/auth-shell';
import { Notice } from '@/components/ui';
import { ApplicationForm } from './forms';
import { registrationAvailability } from '@/modules/core/services/trial-registration.service';
import { provisioningDefaults } from '@/modules/core/services/platform-settings.service';
import { formatStorage } from '@coex/shared/core/saas';
export const metadata = { title: 'Apply for a Worktello trial' };
export default async function RegisterPage() {
  const availability = await registrationAvailability().catch(() => ({ available: false }));
  const defaults = await provisioningDefaults().catch(() => ({
    trialDays: 30,
    storageLimitBytes: 2_000_000_000,
  }));
  return (
    <AuthShell
      title="Apply for a company workspace"
      intro={`${defaults.trialDays} days to try Worktello, with ${formatStorage(defaults.storageLimitBytes)} of file storage. Approval is required before access.`}
    >
      {availability.available ? (
        <ApplicationForm />
      ) : (
        <div className="mt-7 space-y-4">
          <Notice>
            Trial applications are temporarily closed. Please contact Worktello for access.
          </Notice>
          <Link href="/login?view=staff" className="text-sm underline">
            Existing customer? Log in
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
