import { notFound } from 'next/navigation';
import { asUser, requireStaffUser } from '@/lib/session';
import { websiteEditor } from '@/modules/core/services/website-content.service';
import { WebsiteManager } from '@/components/website-manager/manager';
export const metadata = {
  title: 'Website Manager · Worktello',
  robots: { index: false, follow: false },
};
export default async function Page() {
  const actor = await requireStaffUser();
  if (actor.role !== 'platform_admin') notFound();
  const initial = await asUser(actor, websiteEditor);
  return <WebsiteManager initial={initial} />;
}
