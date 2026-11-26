import { asUser, requireStaffUser } from '@/lib/session';
import { websiteEditor } from '@/modules/core/services/website-content.service';
import { WebsiteEditor } from './editor';
export default async function WebsiteContentPage() {
  const actor = await requireStaffUser();
  const initial = await asUser(actor, websiteEditor);
  return <WebsiteEditor initial={initial} />;
}
