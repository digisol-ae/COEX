import { parseVideoLink } from './video-link';
import { connectToDatabase } from '@/lib/db';
import { getContext } from '@/lib/tenant-context';
import { TutorialModel, TutorialSeenModel } from '@coex/shared/core/models/tutorial.model';

export async function currentTutorial() {
  await connectToDatabase();
  return TutorialModel.findOne({ tenantId: getContext().tenantId });
}
export async function tutorialView(admin = false) {
  const tutorial = await currentTutorial();
  if (!tutorial || (!admin && !tutorial.active)) return null;
  const { tenantId, userId } = getContext();
  const seen = await TutorialSeenModel.exists({ tenantId, userId, revision: tutorial.revision });
  const link = tutorial.videoUrl ? parseVideoLink(tutorial.videoUrl) : null;
  return {
    embed: link?.embed ?? false,
    sourceUrl: admin ? (tutorial.videoUrl ?? null) : undefined,
    title: tutorial.title,
    revision: tutorial.revision,
    active: tutorial.active,
    url: link?.url ?? `/api/tutorials/video?revision=${tutorial.revision}`,
    seen: Boolean(seen),
  };
}
