'use server';

import { asUser, requireUser } from '@/lib/session';
import { saveTheme } from '@/modules/core/services/user.service';

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
