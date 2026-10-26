'use server';

import { asUser, requireStaffUser as requireUser } from '@/lib/session';
import { acknowledgeReleaseNotes, saveTheme } from '@/modules/core/services/user.service';
import { getPublishedReleases } from '@/modules/core/services/release-content.service';

/** Saves the person's own theme. The page has already switched; this makes it stick. */
export async function saveThemeAction(theme: string): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await asUser(user, () => saveTheme(theme));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the theme.' };
  }
  return {};
}

/** "I understand": the drawer stops opening by itself until a newer release is added. */
export async function acknowledgeReleaseNotesAction(
  releaseId: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await asUser(user, async () => {
      const { latestId } = await getPublishedReleases();
      if (!latestId || latestId !== releaseId)
        throw new Error('Updates have changed. Reopen What’s new to read the latest content.');
      await acknowledgeReleaseNotes(releaseId);
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save that.' };
  }
  return {};
}
