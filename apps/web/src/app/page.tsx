import { redirect } from 'next/navigation';
import { getSignedInUser } from '@/lib/session';
import { LandingPage } from '@/components/landing/landing-page';
import { DEFAULT_TRIAL_DAYS } from '@coex/shared/core/saas';
import { provisioningDefaults } from '@/modules/core/services/platform-settings.service';

import { publishedWebsite } from '@/modules/core/services/website-content.service';
const fallbackMetadata = {
  title: 'Worktello — Bring your work together',
  description:
    'Manage projects, track time, organize customers, and handle support in one connected workspace.',
};

export async function generateMetadata() {
  const c = await publishedWebsite().catch(() => undefined);
  return c
    ? {
        title: c.seo.title,
        description: c.seo.description,
        openGraph: {
          title: c.seo.title,
          description: c.seo.description,
          ...(c.seo.image ? { images: [c.seo.image] } : {}),
        },
      }
    : fallbackMetadata;
}
export default async function HomePage() {
  const user = await getSignedInUser();
  if (user)
    redirect(
      user.workspaceAccess && user.workspaceAccess !== 'allowed'
        ? '/workspace-status'
        : user.role === 'client_contact'
          ? '/portal'
          : '/dashboard',
    );
  // Keep the public entry available if the database is temporarily unavailable.
  const defaults = await provisioningDefaults().catch(() => ({
    trialDays: DEFAULT_TRIAL_DAYS,
    storageLimitBytes: 2_000_000_000,
  }));
  return (
    <LandingPage
      content={await publishedWebsite().catch(() => undefined)}
      trialDays={defaults.trialDays}
      storageLimitBytes={defaults.storageLimitBytes}
    />
  );
}
