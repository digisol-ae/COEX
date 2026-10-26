import { asUser, requirePermission } from '@/lib/session';
import { PageHeader } from '@/components/ui';
import { getReleaseContent } from '@/modules/core/services/release-content.service';
import { ReleaseManager } from './release-manager';
export const metadata = { title: 'What’s New Management · Worktello' };
export default async function WhatsNewManagementPage() {
  const actor = await requirePermission('tenant.manage');
  const initial = await asUser(actor, getReleaseContent);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="What’s New Management"
        description="Manage updates for your workspace. Expand a topic to edit its paragraphs, then preview and publish."
      />
      <ReleaseManager initial={initial} />
    </div>
  );
}
