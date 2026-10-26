'use server';

import { revalidatePath } from 'next/cache';
import { asUser, requirePermission } from '@/lib/session';
import { changeReleaseContent } from '@/modules/core/services/release-content.service';
import type { ReleaseCommand, ReleaseContentState } from '@/modules/core/release-content';

export async function changeReleaseContentAction(
  version: number,
  command: ReleaseCommand,
): Promise<{ state?: ReleaseContentState; error?: string }> {
  const actor = await requirePermission('tenant.manage');
  try {
    const state = await asUser(actor, () => changeReleaseContent(version, command));
    revalidatePath('/', 'layout');
    return { state };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save content.' };
  }
}
