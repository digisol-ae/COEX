'use server';

import { asUser, requireUser } from '@/lib/session';
import { acknowledgeReleaseNotes, saveTheme } from '@/modules/core/services/user.service';
import { LATEST_RELEASE_ID } from '@/modules/core/release-notes';

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
export async function acknowledgeReleaseNotesAction(): Promise<{ error?: string }> {
  const user = await requireUser();
  try {
    await asUser(user, () => acknowledgeReleaseNotes(LATEST_RELEASE_ID));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save that.' };
  }
  return {};
}
