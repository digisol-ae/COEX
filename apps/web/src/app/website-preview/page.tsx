import { asUser, requireStaffUser } from '@/lib/session';
import { websiteEditor } from '@/modules/core/services/website-content.service';
import { LandingPage } from '@/components/landing/landing-page';
import { provisioningDefaults } from '@/modules/core/services/platform-settings.service';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function Preview() {
  const user = await requireStaffUser();
  const state = await asUser(user, websiteEditor);
  const d = await provisioningDefaults();
  return (
    <LandingPage
      content={state.draft ?? undefined}
      trialDays={d.trialDays}
      storageLimitBytes={d.storageLimitBytes}
    />
  );
}
