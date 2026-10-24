import { tutorialView } from '@/modules/tutorials/service';
import { asUser, requirePermission } from '@/lib/session';
import { PageHeader } from '@/components/ui';
import { TutorialManager } from './tutorial-manager';
export const metadata = { title: 'Tutorials · Worktello' };
export default async function TutorialsPage() {
  const actor = await requirePermission('tenant.manage');
  const initialTutorial = await asUser(actor, () => tutorialView(true));
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Tutorials"
        description="Upload a brief video, preview it, then choose when everyone in your workspace sees it."
      />
      <TutorialManager initialTutorial={initialTutorial} />
    </div>
  );
}
