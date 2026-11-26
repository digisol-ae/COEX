import { notFound } from 'next/navigation';
import { asUser, requireStaffUser } from '@/lib/session';
import { publishedWebsite, websiteEditor } from '@/modules/core/services/website-content.service';
import { PreviewCanvas } from '@/components/website-manager/preview-canvas';
import { provisioningDefaults } from '@/modules/core/services/platform-settings.service';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ version?: string }>;
}) {
  const user = await requireStaffUser();
  if (user.role !== 'platform_admin') notFound();
  const state = await asUser(user, websiteEditor);
  const d = await provisioningDefaults();
  return (
    <PreviewCanvas
      initial={
        (await searchParams).version === 'published'
          ? await publishedWebsite()
          : (state.draft ?? undefined)
      }
      trialDays={d.trialDays}
      storageLimitBytes={d.storageLimitBytes}
    />
  );
}
